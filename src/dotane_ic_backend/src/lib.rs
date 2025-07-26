use candid::Principal;
use canister_http_router::{CallType, CanisterRouter, CanisterRouterContext, HttpRequest, HttpResponse};
use dotane_types::{note_context::{Article, Author, NoteTemplateContext, Site}, AccessType, ListNotesResponse, Note, PublishedNote, UserProfile};
use handlebars::{handlebars_helper, Handlebars};
use ic_asset_certification::{Asset, AssetConfig, AssetRouter};
use ic_cdk::api::{certified_data_set, data_certificate, time};
use ic_http_certification::Method;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory}, BTreeSet, DefaultMemoryImpl, StableBTreeMap
};
use serde_bytes::ByteBuf;

use std::{
    cell::RefCell,
};

use crate::types::{
    CreateUserProfileRequest, UpdateUserProfileRequest, UserCanister, UserNotes, Workspace
};

mod types;

const WORKSPACE_WASM: &[u8] = include_bytes!("../../../bin/dotane_user_storage.wasm");
const NOTE_TEMPLATE: &str = include_str!("../../dotane_landing/templates/note.hbs");

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

    static ROUTER: RefCell<canister_http_router::CanisterRouter> = RefCell::new(CanisterRouter::new());
    static HANDLEBARS: RefCell<Handlebars<'static>> = RefCell::new(Handlebars::new());
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::new());

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

#[ic_cdk::init]
fn init() {
    setup_http_router();
    setup_handlebars();
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    init();
}

fn setup_http_router() {
    ROUTER.with_borrow_mut(|router| {
        router.get("/{note_id}", note_handler);
    });
}

fn setup_handlebars() {
    HANDLEBARS.with_borrow_mut(|handlebars| {
        
        handlebars.register_template_string("note", NOTE_TEMPLATE).unwrap();
    });
}

fn add_asset(path: String, content: Vec<u8>) {
    let asset_vec = vec![
        Asset::new(path.clone(), content)
    ];

    let asset_configs = vec![
        AssetConfig::File {
            path,
            content_type: Some("text/html".to_string()),
            headers: vec![(
                "cache-control".to_string(),
                "public, no-cache, no-store".to_string(),
                
            ),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
            ],
            fallback_for: vec![],
            aliased_by: vec![],
            encodings: vec![],
        }
    ];

    ASSET_ROUTER.with_borrow_mut(|router| {
        router.certify_assets(asset_vec, asset_configs)
    });

}


fn note_handler(cntx: CanisterRouterContext) -> HttpResponse {
    let note_id = cntx.params.as_ref().unwrap().get("note_id").unwrap();
    let caller = ic_cdk::api::msg_caller();
  let user_profile = USER_PROFILES.with_borrow(|profile| profile.get(&caller).unwrap_or(UserProfile::anonymous()));
  PUBLISHED_NOTES.with_borrow(|published| {
    if let Some(published_note) = published.get(note_id) {
      if let AccessType::Public = published_note.access_type {
        let note = NOTES.with(|notes| notes.borrow().get(note_id));
        if let Some(note) = note {
            let assert = ASSET_ROUTER.with_borrow(|router|{
                let d = data_certificate().expect("Failed to get data certificate");
                let request = ic_http_certification::HttpRequest::builder()
                router.serve_asset(d, );
            });
        //   let site = Site::new("Dotane".to_string(), "https://dotane.io".to_string());
        //   let author = Author::new(user_profile.name, user_profile.bio, user_profile.avatar, "https://dotane.io".to_string());
        //   let article = Article::new(note_id.clone(), note.title, note.content, note.created_at);
        //   let context = NoteTemplateContext::new(article, author, site);
        //   let note = HANDLEBARS.with_borrow_mut(|handlebars| {
        //     handlebars.render("note", &context)
        //   }).expect("Failed to render note");

        //   return HttpResponse::builder()
        //     .set_body(ByteBuf::from(note.as_bytes()))
        //     .set_headers(vec![("Content-Type".to_string(), "text/html".to_string())])
        //     .build()
        }
        
      }
    }

    HttpResponse::builder()
      .set_status(404)
      .build()
  })

}

// API endpoints
#[ic_cdk::query]
fn http_request(req : HttpRequest) -> HttpResponse {

    let asset_result = ASSET_ROUTER.with_borrow(|router| {
        let data_cert = data_certificate().expect("Failed to get data certificate");
        let request = ic_http_certification::HttpRequest::builder()
        .with_url(&req.url)
        .with_body(req.body.as_slice())
        .with_method(Method::GET)
        .with_headers(req.headers.clone())
        .build();

        router.serve_asset(&data_cert, &request)
    });

    if asset_result.is_ok() {
        let resp = asset_result.unwrap();
        let api_resp = HttpResponse::builder()
        .set_body(ByteBuf::from(resp.body()))
        .set_status(resp.status_code().as_u16())
        .set_headers(resp.headers().to_vec())
        .build();

    return api_resp;

    }

    ROUTER.with_borrow(|router| {
        router.process(req, CallType::Query)
    })
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

    add_asset(note_id.clone(), rendered_content.as_bytes().to_vec());

    let root_hash = ASSET_ROUTER.with_borrow(|router| {
        router.root_hash()
    });

    certified_data_set(root_hash);

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
    USER_NOTES.with_borrow_mut(|user_notes_store| {
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
    })
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
// Export candid interface
ic_cdk::export_candid!();
ic_asset_server::export_canister_methods!();