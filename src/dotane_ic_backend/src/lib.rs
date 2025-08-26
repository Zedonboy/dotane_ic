use candid::{encode_args, Nat, Principal};
// use canister_http_router::{CallType, CanisterRouter, CanisterRouterContext, HttpRequest, HttpResponse};
use dotane_types::{note_context::{Article, Author, NoteTemplateContext, Site}, AccessType, ListNotesResponse, Note, PublishedNote, UserProfile};
use handlebars::{ Handlebars};
use ic_cdk::{api::{canister_self,time}, management_canister::{create_canister, install_code, raw_rand, CanisterSettings, CreateCanisterArgs, InstallCodeArgs}, pre_upgrade};
use ic_http_certification::{HttpRequest, Method};
use icrc_ledger_types::{icrc1::{account::{principal_to_subaccount, Account, Subaccount}, transfer::{TransferArg, TransferError}}, icrc2::transfer_from::{TransferFromArgs, TransferFromError}};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory}, BTreeSet, DefaultMemoryImpl, StableBTreeMap, StableCell
};

use std::{
    cell::RefCell, cmp::Reverse, collections::{BinaryHeap, HashMap}, time::Duration
};

use crate::types::{
    CreateUserProfileRequest, SessionData, UpdateUserProfileRequest, UserCanister, UserNotes, Workspace,
    PremiumPaymentRequest, PremiumPaymentResponse, TokenType, PaymentPeriod
};

mod types;

const WORKSPACE_WASM: &[u8] = include_bytes!("../../../bin/dotane_user_storage.wasm");
// const ASSET_STORAGE_WASM: &[u8] = include_bytes!("../../../bin/dotane_asset_storage.wasm");
const NOTE_TEMPLATE: &str = include_str!("../../dotane_landing/out/note.hbs.html");
const NOT_FOUND_TEMPLATE: &str = include_str!("../../dotane_landing/out/404.html");
const ASSET_STORAGE_CANISTER_ID: &str = env!("CANISTER_ID_DOTANE_ASSET_STORAGE");

// Define memory type
type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    // Memory manager for managing multiple stable memories
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Stable storage for notes
    static NOTES: RefCell<StableBTreeMap<String, Note, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        )
    );

    // Stable storage for published note IDs
    static PUBLISHED_NOTES: RefCell<StableBTreeMap<String, PublishedNote, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        )
    );

    // // Stable storage for private note IDs
    // static PRIVATE_NOTES: RefCell<StableBTreeMap<String, RestrictedAccessNotes, Memory>> = RefCell::new(
    //     StableBTreeMap::init(
    //         MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
    //     )
    // );

    // Stable storage for user profiles
    static USER_PROFILES: RefCell<StableBTreeMap<Principal, UserProfile, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        )
    );

    // Stable storage for user notes mapping (Principal -> UserNotes)
    static USER_NOTES: RefCell<StableBTreeMap<Principal, UserNotes, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4))),
        )
    );

    static USER_CANISTERS: RefCell<StableBTreeMap<Principal, UserCanister, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5))),
        )
    );

    static PREMIUM_USERS_SET: RefCell<BTreeSet<Principal, Memory>> = RefCell::new(
        BTreeSet::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6))),
        )
    );
    // layout 7 is for setup_asset_server

    // static ROUTER: RefCell<canister_http_router::CanisterRouter> = RefCell::new(CanisterRouter::new());
    static HANDLEBARS: RefCell<Handlebars<'static>> = RefCell::new(Handlebars::new());
    // static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::new());

    // static STABLE_ASSET_STATE: RefCell<StableCell<StableState, Memory>> = RefCell::new(StableCell::new(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(8))), StableState::default()));

    // static ASSET_STORAGE_CANISTER: RefCell<StableCell<Principal, Memory>> = RefCell::new(StableCell::new(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(9))), Principal::anonymous()));

    static ASSET_STORAGE_CANISTER: RefCell<Principal> = RefCell::new(Principal::from_text(ASSET_STORAGE_CANISTER_ID).expect("Failed to parse asset storage canister ID"));

    static EXPIRATION_MAP: RefCell<StableBTreeMap<u64, Principal, Memory>> = RefCell::new(StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)))));

    static AI_SESSIONS: RefCell<HashMap<String, SessionData>> = RefCell::new(HashMap::new());

    static SESSION_USERS: RefCell<HashMap<Principal, String>> = RefCell::new(HashMap::new());

    static PREMIUM_EXPIRATION_HEAP: RefCell<BinaryHeap<Reverse<u64>>> = RefCell::new(BinaryHeap::new());


}

// Helper functions
fn generate_note_id(title: &String) -> String {
    // Use timestamp in milliseconds and caller principal for unique ID generation
    let now_millis = get_current_time_in_milli();
    format!(
        "{}_{}",
        title.to_lowercase().replace(" ", "_"),
        now_millis
    )
}

fn get_current_time_in_milli() -> u64 {
    time() / 1_000_000
}

fn is_authenticated() -> Result<(), String> {
    let caller = ic_cdk::api::msg_caller();
    if caller == Principal::anonymous() {
        return Err("Unauthorized".to_string());
    }
    return Ok(());
}

fn is_premium_user() -> Result<(), String> {
    is_authenticated()?;
    let caller = ic_cdk::api::msg_caller();
    let user_profile = USER_PROFILES.with(|profiles| profiles.borrow().get(&caller));
    if let Some(user_profile) = user_profile {
        if !user_profile.premium {
            return Err("Unauthorized".to_string());
        }
        return Ok(());
    }
    return Err("Unauthorized".to_string());
}

// Helper function to authorize user in asset storage canister
async fn authorize_user_in_asset_storage(user_principal: Principal) -> Result<(), String> {
    let asset_storage_canister = ASSET_STORAGE_CANISTER.with(|canister| *canister.borrow());
    
    // Call the authorize method on the asset storage canister
    let result: Result<(), String> = ic_cdk::call::Call::unbounded_wait(asset_storage_canister, "authorize")
        .with_arg(user_principal)
        .await
        .expect("Failed to call authorize")
        .candid::<()>()
        .map_err(|e| format!("Failed to decode authorize response: {:?}", e));
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to authorize user in asset storage: {}", e)),
    }
}

// Helper function to deauthorize user in asset storage canister
async fn deauthorize_user_in_asset_storage(user_principal: Principal) -> Result<(), String> {
    let asset_storage_canister = ASSET_STORAGE_CANISTER.with(|canister| *canister.borrow());
    
    // Call the deauthorize method on the asset storage canister
    let result: Result<(), String> = ic_cdk::call::Call::unbounded_wait(asset_storage_canister, "deauthorize")
        .with_arg(user_principal)
        .await
        .expect("Failed to call deauthorize")
        .candid::<()>()
        .map_err(|e| format!("Failed to decode deauthorize response: {:?}", e));
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to deauthorize user in asset storage: {}", e)),
    }
}

fn check_premium_expiration() {
    let current_time = get_current_time_in_milli();
   PREMIUM_EXPIRATION_HEAP.with_borrow_mut(|heap| {
    while let Some(Reverse(expiration_time)) = heap.pop() {
        if expiration_time <= current_time {
            let user = EXPIRATION_MAP.with_borrow_mut(|map| map.remove(&expiration_time));
            if let Some(user) = user {

                USER_PROFILES.with_borrow_mut(|profiles| {
                    if let Some(mut profile) = profiles.get(&user) {
                        profile.premium = false;
                    }
                });

                PREMIUM_USERS_SET.with_borrow_mut(|set| {
                    set.remove(&user);
                });
                
                // Deauthorize user from asset storage canister
                ic_cdk::futures::spawn(async move {
                    if let Err(e) = deauthorize_user_in_asset_storage(user).await {
                        ic_cdk::api::debug_print(&format!("Failed to deauthorize user {} from asset storage: {}", user, e));
                    }
                });
            }
        } else {
            heap.push(Reverse(expiration_time));
            break;
        }
    }
   });
}
#[ic_cdk::init]
fn init() {
    setup_asset_server();
    setup_handlebars();
    setup_assets();
    ic_asset_server::add_asset(ic_asset_server::types::Asset {
        path: "/.well-known/ic-domains".to_string(),
        content: r#"
        notes.dotane.io
        "#.as_bytes().to_vec(),
        content_type: "text/plain".to_string(),
        additional_headers: vec![],
    });
    ic_asset_server::set_fallback_asset(ic_asset_server::types::Asset {
        path: "/fallback".to_string(),
        content: NOT_FOUND_TEMPLATE.as_bytes().to_vec(),
        content_type: "text/html".to_string(),
        additional_headers: vec![],
    });


    EXPIRATION_MAP.with_borrow_mut(|map| {
        for key in map.keys(){
            PREMIUM_EXPIRATION_HEAP.with_borrow_mut(|heap| {
                heap.push(Reverse(key));
            });
        }
    });

    ic_cdk_timers::set_timer_interval(Duration::from_secs(24 * 60 * 60), check_premium_expiration);
}

fn setup_asset_server() {
    let memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(7)));
    ic_asset_server::init_store_memory(memory);
}

// #[pre_upgrade]
// fn pre_upgrade() {
//    let assets = ic_certified_stable_assets_server::pre_upgrade();
//    STABLE_ASSET_STATE.with_borrow_mut(|state| {
//     state.set(assets);
//    });
// }
fn clear_premium_users() {
    PREMIUM_USERS_SET.with_borrow_mut(|set| {
        set.clear();
    });

    EXPIRATION_MAP.with_borrow_mut(|map| {
        map.clear_new();
    });

    PREMIUM_EXPIRATION_HEAP.with_borrow_mut(|heap| {
        heap.clear();
    });
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    init();

    #[cfg(network = "local")]
    {
        clear_premium_users();
    }
    // let asset_storage_canister = std::env::var("CANISTER_ID_DOTANE_ASSET_STORAGE").expect("CANISTER_ID_DOTANE_ASSET_STORAGE not found");
    // ASSET_STORAGE_CANISTER.set(Principal::from_text(&asset_storage_canister).expect("Failed to parse asset storage canister ID"));
    // ic_asset_server::post_upgrade();
}

#[ic_cdk::query(guard = "is_authenticated")]
async fn get_deposit_address() -> String {
    let caller = ic_cdk::api::msg_caller();

    let acc = Account {
        owner: canister_self(),
        subaccount: Some(principal_to_subaccount(caller)),
    };

    acc.to_string()
}

#[ic_cdk::query(guard = "is_authenticated")]
async fn get_balance_tuple() -> (String, String) {
    let caller = ic_cdk::api::msg_caller();

    let acc = Account {
        owner: canister_self(),
        subaccount: Some(principal_to_subaccount(caller)),
    };

    let balance = check_user_balance(&TokenType::CKUSDT, acc).await.expect("Failed to get balance");
    let balance_usdc = check_user_balance(&TokenType::CKUSDC, acc).await.expect("Failed to get balance");

    let balance_str = u64_to_decimal(balance, 6);
    let balance_usdc_str = u64_to_decimal(balance_usdc, 6);

    (
        balance_str,
        balance_usdc_str
    )
}

// Helper function to convert u64 (6 decimal places) to decimal string
fn u64_to_decimal(amount: u64, decimals: u32) -> String {
    let whole = amount / 10u64.pow(decimals);
    let frac = amount % 10u64.pow(decimals);
    if frac == 0 {
        format!("{}", whole)
    } else {
        // Pad fractional part with leading zeros if necessary
        let frac_str = format!("{:0width$}", frac, width = decimals as usize);
        // Remove trailing zeros for cleaner display
        let frac_trimmed = frac_str.trim_end_matches('0');
        if frac_trimmed.is_empty() {
            format!("{}", whole)
        } else {
            format!("{}.{}", whole, frac_trimmed)
        }
    }
}

fn setup_assets() {

    PUBLISHED_NOTES.with_borrow(|published| {
        for entry in published.iter() {
            let note_id = entry.key();
            // let published_note = entry.value();
            let note = NOTES.with(|notes| notes.borrow().get(&note_id));
            if let Some(note) = note {
                let rendered_content = HANDLEBARS.with_borrow_mut(|handlebars| {
                    let site = Site::new("Dotane".to_string(), "https://dotane.io".to_string());
                    let author = Author::new(note.author, "".to_string(), "".to_string(), "https://dotane.io".to_string());
                    let article = Article::new(note_id.clone(), note.title, note.content, note.created_at);
                    let context = NoteTemplateContext::new(article, author, site);
                    handlebars.render("note", &context)
                }).expect("Failed to render note");
                add_asset(format!("/{}", note_id), rendered_content.as_bytes().to_vec(), "text/html".to_string());
            }
        }
    });

}

// fn is_controller() -> Result<(), String> {
//     let caller = ic_cdk::api::msg_caller();
//     if caller == Principal::anonymous() {
//         return Err("Unauthorized".to_string());
//     }
//     return Ok(());
// }


fn setup_handlebars() {
    HANDLEBARS.with_borrow_mut(|handlebars| {
        
        handlebars.register_template_string("note", NOTE_TEMPLATE).unwrap();
    });
}

fn add_asset(path: String, content: Vec<u8>, content_type: String) {
    
    let headers = HashMap::from([
        ("Content-Type".to_string(), "text/html".to_string()),
        ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ("Cache-Control".to_string(), "public, no-cache, no-store".to_string()),
    ]);

    ic_asset_server::add_asset(ic_asset_server::types::Asset {
        path,
        content,
        content_type,
        additional_headers: headers.into_iter().map(|(k, v)| (k, v)).collect(),
    });
    
}

// API endpoints
#[ic_cdk::query]
fn http_request(req : ic_http_certification::HttpRequest) -> ic_http_certification::HttpResponse {
    
    // let asset_result = ic_certified_stable_assets_server::get_asset_by_path("/404".to_string()).expect("404 not found");
        // asset_result.status_code = 404;
        // debug_print(&format!("asset_result: {:?}", asset_result));
        // return asset_result;
    let asset_result = ic_asset_server::serve_asset(req.get_path().unwrap_or("/404".to_string()));

    asset_result
}

// this function is used to save a note to the user's private notes
#[ic_cdk::update(guard = "is_premium_user")]
fn save_note(title: String, content: String) -> Result<String, String> {
    let caller = ic_cdk::api::msg_caller();
    // Validate input
    if title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }

    if content.trim().is_empty() {
        return Err("Content cannot be empty".to_string());
    }

    let current_time = get_current_time_in_milli();
    let note_id = generate_note_id(&title);

    let note = Note {
        id: note_id.clone(),
        title: title.trim().to_string(),
        content: content.trim().to_string(),
        created_at: current_time,
        updated_at: current_time,
        author: caller.to_text(),
    };

    // Also save note in USER_NOTES for the caller
    USER_NOTES.with_borrow_mut(|user_notes| {
        let private_notes = user_notes.get(&caller);
        let mut user_data : UserNotes;
        if let None = private_notes {
            user_data = UserNotes::default();
        } else {
            user_data = private_notes.unwrap();
        }
        user_data.private_notes.insert(note_id.clone(), note);
        user_notes.insert(caller, user_data);
    });

    Ok(note_id)
}

#[ic_cdk::update(guard = "is_authenticated")]
async fn create_session() -> SessionData {
    let caller = ic_cdk::api::msg_caller();

    // Check if the user already has a session
    let maybe_existing_session = SESSION_USERS.with_borrow(|sessions| sessions.get(&caller).cloned());
    if let Some(existing_session_id) = maybe_existing_session {
        // If session exists, return the session data
        if let Some(session_data) = AI_SESSIONS.with_borrow(|sessions| sessions.get(&existing_session_id).cloned()) {
            // Check if the session is expired
            if session_data.expires_at <= get_current_time_in_milli() {
                // Session expired, remove it and continue to create a new one
                AI_SESSIONS.with_borrow_mut(|sessions| { sessions.remove(&existing_session_id); });
                SESSION_USERS.with_borrow_mut(|sessions| { sessions.remove(&caller); });
            } else {
                // Session is still valid, return it
                return session_data;
            }
            return session_data;
        }
    };


    let id_bytes = raw_rand().await.expect("Failed to generate random bytes");
    let id = hex::encode(id_bytes);
    // Determine query_limit based on premium status
    let query_limit = if PREMIUM_USERS_SET.with_borrow(|set| set.contains(&caller)) {
        None
    } else {
        Some(15)
    };

    let expires_at = get_current_time_in_milli() + 60 * 60 * 1000; // 1 hour from now

    let session_data = SessionData {
        session_id: id.clone(),
        query_limit,
        expires_at,
    };

    // Store the session
    AI_SESSIONS.with_borrow_mut(|sessions| {
        sessions.insert(id.clone(), session_data.clone());
    });
    SESSION_USERS.with_borrow_mut(|sessions| {
        sessions.insert(caller, id.clone());
    });

    session_data


}

#[ic_cdk::query]
fn get_session_data(session_id: Option<String>) -> Result<SessionData, String> {
    let caller = ic_cdk::api::msg_caller();
    if let Some(session_id) = session_id {
        // Try to get session data by session_id
        if let Some(session_data) = AI_SESSIONS.with_borrow(|sessions| sessions.get(&session_id).cloned()) {
            if session_data.expires_at <= get_current_time_in_milli() {
                Err("Session expired".to_string())
            } else {
                Ok(session_data)
            }
        } else {
            Err("Session not found".to_string())
        }
    } else {
        // Get by caller, provided caller is not anonymous
        if caller == Principal::anonymous() {
            return Err("Unauthorized".to_string());
        }
        // Find session id for this caller
        if let Some(session_id) = SESSION_USERS.with_borrow(|sessions| sessions.get(&caller).cloned()) {
            if let Some(session_data) = AI_SESSIONS.with_borrow(|sessions| sessions.get(&session_id).cloned()) {
                if session_data.expires_at <= get_current_time_in_milli() {
                    Err("Session expired".to_string())
                } else {
                    Ok(session_data)
                }
            } else {
                Err("Session not found".to_string())
            }
        } else {
            Err("No session found for caller".to_string())
        }
    }
}


#[ic_cdk::query(guard = "is_authenticated")]
fn list_notes() -> ListNotesResponse {
    let caller = ic_cdk::api::msg_caller();
    let mut private_notes = Vec::new();
    let mut published_notes = Vec::new();

    USER_NOTES.with_borrow(|user_notes| {
        let user_notes_ref = user_notes.get(&caller);
        if let Some(user_notes) = user_notes_ref {
            for note_id in user_notes.published_note_ids {
                // TODO: Get the note from the storage canister
                if let Some(note) = NOTES.with(|notes| notes.borrow().get(&note_id)) {
                    published_notes.push(note);
                }
            }
            for (_, note) in user_notes.private_notes {
                private_notes.push(note);
            }
           
        }
    });

    ListNotesResponse {
        private_notes,
        published_notes,
    }
}

// this function is used to publish a note to the user's published notes
#[ic_cdk::update(guard = "is_premium_user")]
fn publish_saved_note(note_id: String, access_type: AccessType) -> Result<(), String> {
    let caller = ic_cdk::api::msg_caller();
    // Check if the note is already published
    USER_NOTES.with_borrow_mut(|user_notes_store| {
        let user_notes_ref = user_notes_store.get(&caller);
        if let Some(mut user_notes) = user_notes_ref {
            if user_notes.published_note_ids.contains(&note_id) {
                return Err("Note already published".to_string());
            }

            let notes_exists = NOTES.with(|notes| notes.borrow().contains_key(&note_id));

            // check the notes in NOTES if the note_id exists
            if notes_exists {
               
                return Err("Note already exists".to_string());
            }

            let note = user_notes.private_notes.remove(&note_id);
            if let Some(note) = note {
                PUBLISHED_NOTES.with_borrow_mut(|published| {
                    let published_note = PublishedNote {
                        note_id: note.id.clone(),
                        author: caller.to_string(),
                        created_at: note.created_at,
                        updated_at: note.updated_at,
                        storage_canister: None,
                        access_type,
                    };
                    published.insert(note_id.clone(), published_note);
                });
                user_notes.published_note_ids.insert(note_id);
                user_notes_store.insert(caller, user_notes);
                Ok(())
            } else {
                Err("Note not found".to_string())
            }
        } else {
            return Err("Note not found".to_string());
        }
    })
}

fn render_and_save_note(note_id: String) -> Result<(), String> {
    // Retrieve the note by its id
    let note = NOTES.with_borrow(|notes| notes.get(&note_id));
    if let Some(note) = note {
        // Get the user profile for author info (if available)
        let author_principal = Principal::from_text(&note.author).unwrap_or(Principal::anonymous());
        let user_profile = USER_PROFILES.with_borrow(|profiles| {
            profiles.get(&author_principal).unwrap_or(UserProfile::anonymous())
        });

        // Prepare context for Handlebars rendering
        let site = Site::new("Dotane".to_string(), "https://dotane.io".to_string());
        let author = Author::new(
            user_profile.name,
            user_profile.bio,
            user_profile.avatar,
            "https://dotane.io".to_string(),
        );
        let article = Article::new(
            note.id.clone(),
            note.title.clone(),
            note.content.clone(),
            note.created_at,
        );
        let context = NoteTemplateContext::new(article, author, site);

        // Render the note content using Handlebars
        let rendered_content = HANDLEBARS.with_borrow_mut(|handlebars| {
            handlebars.render("note", &context)
        }).map_err(|e| format!("Failed to render note: {}", e))?;

        // Add the rendered HTML to the asset store
        add_asset(format!("/{}", note_id), rendered_content.as_bytes().to_vec(), "text/html".to_string());

        Ok(())
    } else {
        Err("Note not found".to_string())
    }
    
    
}

#[ic_cdk::update(guard = "is_authenticated")]
fn publish_note(title: String, content: String, access_type: AccessType) -> Result<Note, String> {
    let caller = ic_cdk::api::msg_caller();
    let note_id = generate_note_id(&title);
    let current_time = get_current_time_in_milli();

    let user_profile = USER_PROFILES.with_borrow(|profile| profile.get(&caller).unwrap_or(UserProfile::anonymous()));

    let rendered_content = HANDLEBARS.with_borrow_mut(|handlebars| {
        let site = Site::new("Dotane".to_string(), "https://dotane.io".to_string());
          let author = Author::new(user_profile.name, user_profile.bio, user_profile.avatar, "https://dotane.io".to_string());
          let article = Article::new(note_id.clone(), title.clone(), content.clone(), current_time);
          let context = NoteTemplateContext::new(article, author, site);
        handlebars.render("note", &context)
    }).expect("Failed to render note");

    add_asset(format!("/{}", note_id), rendered_content.as_bytes().to_vec(), "text/html".to_string());

    let note = Note {
        id: note_id.clone(),
        title: title.trim().to_string(),
        content: content.trim().to_string(),
        created_at: current_time,
        updated_at: current_time,
        author: caller.to_string(),
    };

    PUBLISHED_NOTES.with_borrow_mut(|published| {
        let published_note = PublishedNote {
            note_id: note_id.clone(),
            author: caller.to_string(),
            created_at: current_time,
            updated_at: current_time,
            storage_canister: None,
            access_type,
        };
        published.insert(note_id.clone(), published_note);
    });

    NOTES.with_borrow_mut(|notes| {
        notes.insert(note_id.clone(), note.clone());
    });

    // Also save note in USER_NOTES for the caller
    USER_NOTES.with_borrow_mut(|users_notes_store| {
        let user_notes_ref = users_notes_store.get(&caller);
        let mut user_data : UserNotes;
        if let None = user_notes_ref {
            user_data = UserNotes::default();
        } else {
            user_data = user_notes_ref.unwrap();
        }
        user_data.published_note_ids.insert(note_id.clone());
        users_notes_store.insert(caller, user_data);
    });

    Ok(note)
}

#[ic_cdk::update]
fn unpublish_note(note_id: String) -> Result<Note, String> {
    let caller = ic_cdk::api::msg_caller();
    // Check if note exists and belongs to author
    PUBLISHED_NOTES.with_borrow_mut(|published| {
        let published_note = published.get(&note_id);
        if let Some(published_note) = published_note {
            if published_note.author == caller.to_string() {
                ic_asset_server::delete_asset(format!("/{}", note_id));
                let p_note = published.remove(&note_id).unwrap();
                //TODO: Delete the note from the storage canister
                let note = NOTES.with(|notes| notes.borrow_mut().remove(&note_id));
                //TODO: Remove the note from the USER_NOTES for the caller
                
                USER_NOTES.with_borrow_mut(|user_notes_store| {
                    let user_notes_ref = user_notes_store.get(&caller);
                    let mut user_data : UserNotes;
                    if let None = user_notes_ref {
                        user_data = UserNotes::default();
                    } else {
                        user_data = user_notes_ref.unwrap();
                    }
                    user_data.published_note_ids.remove(&note_id);

                    // if user is premium, add the note to the private notes
                    if is_premium_user().is_ok() && note.is_some() {
                        user_data.private_notes.insert(note_id, note.clone().unwrap());
                    }
                    user_notes_store.insert(caller, user_data);
                });
                Ok(note.unwrap())
            } else {
                Err("Not authorized to unpublish this note".to_string())
            }
        } else {
            Err("Note not found".to_string())
        }
    })
}

#[ic_cdk::update(guard = "is_authenticated")]
fn delete_saved_note(note_id: String) -> Result<Note, String> {
    let caller = ic_cdk::api::msg_caller();
    // if the note is private, delete it from the private notes
    USER_NOTES.with_borrow_mut(|user_notes_store| {
        let user_notes_ref = user_notes_store.get(&caller);
        if let Some(mut user_notes) = user_notes_ref {
            let note = user_notes.private_notes.remove(&note_id);
            if let Some(note) = note {
                Ok(note)
            } else {
                Err("Note not found".to_string())
            }
        } else {
            Err("Note not found".to_string())
        }
    })
}

#[ic_cdk::update(guard = "is_authenticated")]
fn update_note(
    note_id: String,
    content: String,
) -> Result<(), String> {
    if content.trim().is_empty() {
        return Err("Content cannot be empty".to_string());
    }

    let caller = ic_cdk::api::msg_caller();

    // Get the user's notes
    let update_result = USER_NOTES.with_borrow_mut(|user_notes_store| {
        let user_notes_ref = user_notes_store.get(&caller);
        if let Some(mut user_notes) = user_notes_ref {
            // Check if the note is in published_note_ids
            if user_notes.published_note_ids.contains(&note_id) {
                // Check for authorization: only the author can update
                let note_opt = NOTES.with(|notes| notes.borrow().get(&note_id));
                if let Some(mut note) = note_opt {
                    if note.author != caller.to_text() {
                        return Err("Not authorized to update this note".to_string());
                    }
                    // Update the note content and updated_at
                    note.content = content.trim().to_string();
                    note.updated_at = get_current_time_in_milli();
                    // Save the updated note
                    NOTES.with(|notes| notes.borrow_mut().insert(note_id.clone(), note));
                    Ok(())
                } else {
                    Err("Note not found".to_string())
                }
            } else {
                // Not a published note, check if it's a private note
                if let Some(mut note) = user_notes.private_notes.get_mut(&note_id) {
                    // Only the owner can update their private note
                    note.content = content.trim().to_string();
                    note.updated_at = get_current_time_in_milli();
                    // Save the updated user notes
                    user_notes_store.insert(caller, user_notes);
                    Ok(())
                } else {
                    Err("Note not found".to_string())
                }
            }
        } else {
            Err("User notes not found".to_string())
        }
    });

    // After update and note is saved, call render_and_save_function if update was successful
    if update_result.is_ok() {
        // You may want to handle the result of render_and_save_function, but here we just call it
        // and ignore its result for now.
        let _ = render_and_save_note(note_id);
    }

    update_result
}

#[ic_cdk::query(guard = "is_authenticated")]
fn get_workspaces() -> Vec<Workspace> {
    let caller = ic_cdk::api::msg_caller();
    let user_canisters = USER_CANISTERS.with(|canisters| canisters.borrow().get(&caller));
    if let Some(user_canisters) = user_canisters {
        let mut workspaces = Vec::new();
        for (canister_id, domain) in user_canisters.user_canisters {
            workspaces.push(Workspace {
                canister_id: canister_id,
                domain: domain,
            });
        }
        return workspaces;
    }
    return Vec::new();
}

#[ic_cdk::update]
fn create_user_profile(
    req: CreateUserProfileRequest
) -> Result<(), String> {
    let current_time = get_current_time_in_milli();
    let user_id = ic_cdk::api::msg_caller();

    let profile = UserProfile {
        name: req.name.trim().to_string(),
        email: req.email.trim().to_string(),
        bio: req.bio.trim().to_string(),
        avatar: req.avatar.trim().to_string(),
        created_at: current_time,
        updated_at: current_time,
        premium: false,
        marked_public: req.marked_public,
    };

    USER_PROFILES.with(|profiles| {
        profiles.borrow_mut().insert(user_id, profile);
    });

    Ok(())
}

#[ic_cdk::query(guard = "is_authenticated")]
fn get_my_profile() -> Result<UserProfile, String> {
    let user_id = ic_cdk::api::msg_caller();
    USER_PROFILES.with(|profiles| {
        let profile = profiles.borrow().get(&user_id);
        if let Some(profile) = profile {
            Ok(profile)
        } else {    
            Ok(UserProfile::anonymous())
        }
    })
}

#[ic_cdk::query]
fn get_user_profile(user_id: String) -> Result<UserProfile, String> {
    let user_id = Principal::from_text(&user_id).unwrap();
    USER_PROFILES.with(|profiles| {
        let profile = profiles.borrow().get(&user_id);
        if let Some(profile) = profile {
            if !profile.marked_public {
                return Err("User profile is not marked public".to_string());
            }
            Ok(profile)
        } else {
            Err("User profile not found".to_string())
        }
    })
}

#[ic_cdk::query(guard = "is_authenticated")]
fn is_workspace_premium_user() -> bool {
    let caller = ic_cdk::api::msg_caller();
    let premium_users_set = PREMIUM_USERS_SET.with_borrow(|set| set.contains(&caller));
    return premium_users_set;
}

// #[ic_cdk::query]
// fn http_request(req : HttpRe)

#[ic_cdk::update]
fn update_user_profile(
    req: UpdateUserProfileRequest
) -> Result<(), String> {
    let user_id = ic_cdk::api::msg_caller();
    let current_time = get_current_time_in_milli();

    USER_PROFILES.with(|profiles| {
        let mut profiles_ref = profiles.borrow_mut();
        if let Some(mut profile) = profiles_ref.get(&user_id) {
            profile.name = req.name.unwrap_or(profile.name);
            profile.email = req.email.unwrap_or(profile.email);
            profile.bio = req.bio.unwrap_or(profile.bio);
            profile.avatar = req.avatar.unwrap_or(profile.avatar);
            profile.updated_at = current_time;
            profile.marked_public = req.marked_public.unwrap_or(profile.marked_public);
            profiles_ref.insert(user_id, profile);
            Ok(())
        } else {
            Err("User profile not found".to_string())
        }
    })
}

// Premium payment constants
const MONTHLY_PAYMENT_AMOUNT: u64 = 6_000_000; // 6 USDC/USDT (6 decimal places)
const YEARLY_PAYMENT_AMOUNT: u64 = 60_000_000; // 60 USDC/USDT (6 decimal places)

// Promo pricing constants (50% discount)
const MONTHLY_PROMO_AMOUNT: u64 = 3_990_000; // 4 USDC/USDT (6 decimal places)
const YEARLY_PROMO_AMOUNT: u64 = 55_000_000; // 55 USDC/USDT (6 decimal places)

// System account for receiving payments
fn get_system_account() -> Account {
    // This should be the account where payments are received
    // For now, using a placeholder - you'll need to set this to your actual system account
    Account {
        owner: canister_self(),
        subaccount: None,
    }
}

// Get the appropriate ledger canister ID based on token type
fn get_ledger_canister_id(token_type: &TokenType) -> Principal {
    match token_type {
        TokenType::CKUSDC => {
            // CKUSDC ledger canister ID
            Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap()
        },
        TokenType::CKUSDT => {
            // CKUSDT ledger canister ID  
            Principal::from_text("cngnf-vqaaa-aaaar-qag4q-cai").unwrap()
        }
    }
}

// Get payment amount based on period and promo status
fn get_payment_amount(payment_period: &PaymentPeriod, is_promo: bool) -> u64 {
    match (payment_period, is_promo) {
        (PaymentPeriod::Monthly, false) => MONTHLY_PAYMENT_AMOUNT,
        (PaymentPeriod::Monthly, true) => MONTHLY_PROMO_AMOUNT,
        (PaymentPeriod::Yearly, false) => YEARLY_PAYMENT_AMOUNT,
        (PaymentPeriod::Yearly, true) => YEARLY_PROMO_AMOUNT,
    }
}

// Check user's balance for a specific token
async fn check_user_balance(token_type: &TokenType, user_account: Account) -> Result<u64, String> {
    let ledger_canister_id = get_ledger_canister_id(token_type);
    
    let response: Nat = 
        ic_cdk::call::Call::unbounded_wait(ledger_canister_id, "icrc1_balance_of").with_arg(user_account).await.expect("Failed to get balance").candid::<Nat>().expect("Failed to decode balance");
    
    Ok(response.0.try_into().unwrap())
}

#[ic_cdk::update(guard = "is_authenticated")]
async fn notify_deposit_premium_payment(
    request: PremiumPaymentRequest
) -> PremiumPaymentResponse {
    let caller = ic_cdk::api::msg_caller();
    
    // Check if user is already premium
    if PREMIUM_USERS_SET.with_borrow(|set| set.contains(&caller)) {
        return PremiumPaymentResponse {
            success: false,
            message: "User is already a premium member".to_string(),
            transaction_id: None,
        };
    }

    let payment_amount = get_payment_amount(&request.payment_period, false); // Default to regular pricing
    
    // Get user's account identifier
    let user_account = Account {
        owner: canister_self(),
        subaccount: Some(principal_to_subaccount(caller)),
    };
    
    // Check user's balance
    let balance_result = check_user_balance(&request.token_type, user_account.clone()).await;
    match balance_result {
        Ok(balance) => {
            if balance < payment_amount {
                return PremiumPaymentResponse {
                    success: false,
                    message: format!("Insufficient balance. Required: {}, Available: {}", 
                                   payment_amount, balance),
                    transaction_id: None,
                };
            }
        },
        Err(error) => {
            return PremiumPaymentResponse {
                success: false,
                message: format!("Failed to check balance: {}", error),
                transaction_id: None,
            };
        }
    }
    
    let ledger_canister_id = get_ledger_canister_id(&request.token_type);
    let system_account = get_system_account();

    // Create transfer arguments
    let transfer_args = TransferArg {
        from_subaccount: Some(principal_to_subaccount(caller)),
        to: system_account,
        amount: Nat::from(payment_amount),
        fee: None, // Standard fee
        memo: None,
        created_at_time: None,
    };

    // Perform the transfer
    let transfer_result: Result<Nat, TransferError> = 
        ic_cdk::call::Call::unbounded_wait(ledger_canister_id, "icrc1_transfer").with_arg(transfer_args).await.expect("Transfer failed").candid::<Result<Nat, TransferError>>().expect("Failed to decode transfer result");

    match transfer_result {
        Ok(block_index) => {
            let expiration_time = get_current_time_in_milli() + request.payment_period.to_millis();
            PREMIUM_EXPIRATION_HEAP.with_borrow_mut(|heap| {
                heap.push(Reverse(expiration_time));
            });
            EXPIRATION_MAP.with_borrow_mut(|map| {
                map.insert(expiration_time, caller);
            });
                        // Transfer successful, add user to premium
            PREMIUM_USERS_SET.with_borrow_mut(|set| {
                set.insert(caller);
            });
            
            // Update user profile to mark as premium
            USER_PROFILES.with_borrow_mut(|profiles| {
                if let Some(mut profile) = profiles.get(&caller) {
                    profile.premium = true;
                    profile.updated_at = get_current_time_in_milli();
                    profiles.insert(caller, profile);
                }
            });
            
           
            
            // Authorize user in asset storage canister
            if let Err(e) = authorize_user_in_asset_storage(caller).await {
                ic_cdk::api::debug_print(&format!("Failed to authorize user {} in asset storage: {}", caller, e));
            }

            PremiumPaymentResponse {
                success: true,
                message: format!("Premium payment successful for {:?} {:?}", request.payment_period, request.token_type),
                transaction_id: Some(block_index.to_string()),
            }
        },
        Err(transfer_error) => {
            PremiumPaymentResponse {
                success: false,
                message: format!("Transfer error: {:?}", transfer_error),
                transaction_id: None,
            }
        },
        
    }
}

#[ic_cdk::update(guard = "is_authenticated")]
async fn notify_payment_approval(
    principal_string: String,
    payment_period: PaymentPeriod
) -> PremiumPaymentResponse {
    let caller = ic_cdk::api::msg_caller();
    
    // Convert string to principal
    let user_principal = match Principal::from_text(&principal_string) {
        Ok(principal) => principal,
        Err(_) => {
            return PremiumPaymentResponse {
                success: false,
                message: "Invalid principal string".to_string(),
                transaction_id: None,
            };
        }
    };
    
    // Check if user is already premium
    if PREMIUM_USERS_SET.with_borrow(|set| set.contains(&user_principal)) {
        return PremiumPaymentResponse {
            success: false,
            message: "User is already a premium member".to_string(),
            transaction_id: None,
        };
    }
    
    let payment_amount = get_payment_amount(&payment_period, true); // promo pricing
    
    // Get user's account identifier
    let user_account = Account {
        owner: user_principal,
        subaccount: None,
    };
    
    // Check user's balance for USDC
    let balance_result = check_user_balance(&TokenType::CKUSDC, user_account.clone()).await;
    match balance_result {
        Ok(balance) => {
            if balance < payment_amount {
                return PremiumPaymentResponse {
                    success: false,
                    message: format!("Insufficient USDC balance. Required: {}, Available: {}", 
                                   payment_amount, balance),
                    transaction_id: None,
                };
            }
        },
        Err(error) => {
            return PremiumPaymentResponse {
                success: false,
                message: format!("Failed to check USDC balance: {}", error),
                transaction_id: None,
            };
        }
    }
    
    let ledger_canister_id = get_ledger_canister_id(&TokenType::CKUSDC);
    let system_account = get_system_account();

    let transfer_args = TransferFromArgs {
        spender_subaccount: None,
        from: user_account,
        to: system_account,
        amount: Nat::from(payment_amount),
        fee: None,
        memo: None,
        created_at_time: None,
    };
    
    
    // Perform the transfer
    let transfer_result: Result<Nat, TransferFromError> = 
        ic_cdk::call::Call::unbounded_wait(ledger_canister_id, "icrc2_transfer_from")
            .with_arg(transfer_args)
            .await
            .expect("Transfer failed")
            .candid::<Result<Nat, TransferFromError>>()
            .expect("Failed to decode transfer result");
    
    match transfer_result {
        Ok(block_index) => {
            let expiration_time = get_current_time_in_milli() + payment_period.to_millis();
            PREMIUM_EXPIRATION_HEAP.with_borrow_mut(|heap| {
                heap.push(Reverse(expiration_time));
            });
            EXPIRATION_MAP.with_borrow_mut(|map| {
                map.insert(expiration_time, caller);
            });
            // Transfer successful, add user to premium
            PREMIUM_USERS_SET.with_borrow_mut(|set| {
                set.insert(caller);
            });
            
            // Update user profile to mark as premium
            USER_PROFILES.with_borrow_mut(|profiles| {
                if let Some(mut profile) = profiles.get(&caller) {
                    profile.premium = true;
                    profile.updated_at = get_current_time_in_milli();
                    profiles.insert(user_principal, profile);
                }
            });

            if let Err(e) = authorize_user_in_asset_storage(caller).await {
                ic_cdk::api::debug_print(&format!("Failed to authorize user {} in asset storage: {}", caller, e));
            }
            
            PremiumPaymentResponse {
                success: true,
                message: format!("Premium payment approval successful for {:?} period", payment_period),
                transaction_id: Some(block_index.to_string()),
            }
        },
        Err(transfer_error) => {
            PremiumPaymentResponse {
                success: false,
                message: format!("Transfer error: {:?}", transfer_error),
                transaction_id: None,
            }
        },
    }
}

#[ic_cdk::query(guard = "is_authenticated")]
fn get_premium_payment_info() -> Result<HashMap<String, u64>, String> {
    let mut payment_info = HashMap::new();
    payment_info.insert("monthly_amount".to_string(), MONTHLY_PAYMENT_AMOUNT);
    payment_info.insert("yearly_amount".to_string(), YEARLY_PAYMENT_AMOUNT);
    Ok(payment_info)
}

/// Function to make a user premium by converting a string to principal
/// This function is only available when NETWORK environment variable is set to "local"
#[cfg(network = "local")]
#[ic_cdk::update]
async fn make_user_premium(principal_string: String, expiration_time: u64) -> Result<(), String> {
    // Convert string to principal
    let user_principal = match Principal::from_text(&principal_string) {
        Ok(principal) => principal,
        Err(_) => {
            return Err("Invalid principal string".to_string());
        }
    };
    // Authorize user in asset storage canister
    if let Err(e) = authorize_user_in_asset_storage(user_principal).await {
        ic_cdk::api::debug_print(&format!("Failed to authorize user {} in asset storage: {}", user_principal, e));
    }
    
    
    // Check if user is already premium
    if PREMIUM_USERS_SET.with_borrow(|set| set.contains(&user_principal)) {
        return Err("User is already a premium member".to_string());
    }
    
    // Add to premium expiration tracking
    PREMIUM_EXPIRATION_HEAP.with_borrow_mut(|heap| {
        heap.push(Reverse(expiration_time));
    });
    
    EXPIRATION_MAP.with_borrow_mut(|map| {
        map.insert(expiration_time, user_principal);
    });
    
    // Add user to premium set
    PREMIUM_USERS_SET.with_borrow_mut(|set| {
        set.insert(user_principal);
    });
    
    // Update user profile to mark as premium
    USER_PROFILES.with_borrow_mut(|profiles| {
        if let Some(mut profile) = profiles.get(&user_principal) {
            profile.premium = true;
            profile.updated_at = get_current_time_in_milli();
            profiles.insert(user_principal, profile);
        } else {
            let mut profile = UserProfile::anonymous();
            profile.premium = true;
            profile.updated_at = get_current_time_in_milli();
            profiles.insert(user_principal, profile);
            // Create a default profile if none exists
        }
    });
    
    
    
    Ok(())
}

// Export candid interface
ic_cdk::export_candid!();
