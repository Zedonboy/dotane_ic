use std::cell::RefCell;

use candid::{CandidType, Principal};
use canister_http_router::{CallType, CanisterRouter, CanisterRouterContext, HttpRequest, HttpResponse};
use dotane_types::{AccessType, ListNotesResponse, Note, PublishedNote, UserProfile};
use handlebars::Handlebars;
// use ic_asset_server::{export_canister_methods, upload_assets::logic::StableState};
use ic_cdk::{api::{self, canister_self, time}, export_candid, init, management_canister::{self, CanisterInfoArgs}, post_upgrade};
use ic_stable_structures::{memory_manager::{MemoryId, MemoryManager, VirtualMemory}, DefaultMemoryImpl, StableBTreeMap, StableBTreeSet, StableCell};
use serde_bytes::ByteBuf;

use crate::{note_context::{Article, Author, NoteTemplateContext, Site}, types::WorkspaceContext};
mod note_context;
mod types;

static  WORKSPACE_HTML : &str = include_str!("../../dotane_landing/out/workspace.hbs.html");
static NOTE_TEMPLATE : &str = include_str!("../../dotane_landing/templates/note.hbs");

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
    ));

   // Stable storage for published note IDs
   static PUBLISHED_NOTES: RefCell<StableBTreeMap<String, PublishedNote, Memory>> = RefCell::new(
    StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
    ));

    // Stable storage for private note IDs
    static PRIVATE_NOTES: RefCell<StableBTreeSet<String, Memory>> = RefCell::new(
        StableBTreeSet::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
        )
    );

    static ROUTER: RefCell<CanisterRouter> = RefCell::new(CanisterRouter::new());

    static HANDLEBARS: RefCell<Handlebars<'static>> = RefCell::new(Handlebars::new());

    static OWNER_PROFILE : RefCell<StableCell<UserProfile, Memory>> = RefCell::new(StableCell::new(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))), UserProfile::default()).unwrap());

    // static STABLE_ASSET_STATE: RefCell<StableCell<StableState, Memory>> = RefCell::new(StableCell::new(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))), StableState::default()).unwrap());


}


#[init]
fn init() {
  setup_handlebars();
  setup_http_router();
}

#[post_upgrade]
fn post_upgrade() {
  init();
}



fn is_authenticated() -> Result<(), String> {
  let caller = ic_cdk::api::msg_caller();
  if caller == Principal::anonymous() {
    Err("Unauthorized".to_string())
  } else {
    Ok(())
  }
}

fn is_controller() -> Result<(), String> {
  is_authenticated()?;
  let caller = ic_cdk::api::msg_caller();
  if ic_cdk::api::is_controller(&caller) {
    Ok(())
  } else {
    Err("Unauthorized".to_string())
  }
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


#[ic_cdk::update(guard = "is_controller")]
fn save_note(title: String, content: String) -> Result<(), String> {
  let note_id = generate_note_id(&title);
  let note = Note {
    id: note_id.clone(),
    title,
    content,
    created_at: get_current_time_in_milli(),
    updated_at: get_current_time_in_milli(),
    author: ic_cdk::api::msg_caller().to_string(),
  };
  NOTES.with_borrow_mut(|notes| {
    notes.insert(note.id.clone(), note);
  });
  PRIVATE_NOTES.with_borrow_mut(|private_notes| {
    private_notes.insert(note_id);
  });
  Ok(())
}

#[ic_cdk::query(guard = "is_controller")]
fn list_notes() -> ListNotesResponse {
    let mut private_notes_vec = Vec::new();
    let mut published_notes_vec = Vec::new();

    PUBLISHED_NOTES.with_borrow(|published_notes| {
        for (note_id, _) in published_notes.iter() {
                // TODO: Get the note from the storage canister
                if let Some(note) = NOTES.with(|notes| notes.borrow().get(&note_id)) {
                    published_notes_vec.push(note);
                }
        }
    });

    PRIVATE_NOTES.with_borrow(|private_notes| {
        for note_id in private_notes.iter() {
            if let Some(note) = NOTES.with(|notes| notes.borrow().get(&note_id)) {
                private_notes_vec.push(note);
            }
        }
    });

    ListNotesResponse {
        private_notes: private_notes_vec,
        published_notes: published_notes_vec,
    }
}

#[ic_cdk::update(guard = "is_controller")]
fn publish_saved_note(note_id: String, access_type: AccessType) -> Result<(), String> {
  // check if it exists
  let exists = NOTES.with(|notes| notes.borrow().contains_key(&note_id));
  if !exists {
    return Err("Note not found".to_string());
  }

  let removed = PRIVATE_NOTES.with_borrow_mut(|private_notes| {
    private_notes.remove(&note_id)
  });

  if removed {
    // check if it is already published
    let is_published = PUBLISHED_NOTES.with(|published_notes| {
      published_notes.borrow().contains_key(&note_id)
    });
    if is_published {
      return Err("Note already published".to_string());
    }
    let p_note = PublishedNote {
      access_type,
      note_id: note_id.clone(),
      author: ic_cdk::api::msg_caller().to_string(),
      created_at: get_current_time_in_milli(),
      updated_at: get_current_time_in_milli(),
      storage_canister: Some(ic_cdk::api::canister_self().to_text()),
    };
    PUBLISHED_NOTES.with_borrow_mut(|published_notes| {
      published_notes.insert(note_id, p_note);
    });
  } else {
    return Err("Note not found".to_string());
  }

  Ok(())
}

#[ic_cdk::update(guard = "is_controller")]
fn publish_note(title: String, content: String, access_type: AccessType) -> Result<Note, String> {
    let caller = ic_cdk::api::msg_caller();
    let note_id = generate_note_id(&title);
    let current_time = get_current_time_in_milli();
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
            storage_canister: Some(ic_cdk::api::canister_self().to_text()),
            access_type,
        };
        published.insert(note_id.clone(), published_note);
    });

    NOTES.with_borrow_mut(|notes| {
        notes.insert(note_id.clone(), note.clone());
    });

    Ok(note)
}


#[ic_cdk::update(guard = "is_controller")]
fn unpublish_note(note_id: String) -> Result<(), String> {
    let caller = ic_cdk::api::msg_caller();
    // Check if note exists and belongs to author
    PUBLISHED_NOTES.with_borrow_mut(|published| {
        let published_note = published.get(&note_id);
        if let Some(published_note) = published_note {
            if published_note.author == caller.to_string() {
                published.remove(&note_id).unwrap();
                
                
                PRIVATE_NOTES.with_borrow_mut(|private_notes| {
                    private_notes.insert(note_id);
                });

                Ok(())
            } else {
                Err("Not authorized to unpublish this note".to_string())
            }
        } else {
            Err("Note not found".to_string())
        }
    })
}

#[ic_cdk::update(guard = "is_controller")]
fn delete_saved_note(note_id: String) -> Result<Note, String> {
    // if the note is private, delete it from the private notes
    PRIVATE_NOTES.with_borrow_mut(|private_notes| {
        private_notes.remove(&note_id);
    });

    let note = NOTES.with(|notes| notes.borrow_mut().remove(&note_id));
    if let Some(note) = note {
        Ok(note)
    } else {
        Err("Note not found".to_string())
    }
}

#[ic_cdk::update(guard = "is_controller")]
fn update_note(
    note_id: String,
    content: String,
) -> Result<(), String> {
    if content.trim().is_empty() {
        return Err("Content cannot be empty".to_string());
    }

    // let caller = ic_cdk::api::msg_caller();
    let current_time = get_current_time_in_milli();

    NOTES.with_borrow_mut(|notes| {
        let note = notes.get(&note_id);
        if let Some(mut note) = note {
            note.content = content.trim().to_string();
            note.updated_at = current_time;
            notes.insert(note_id.clone(), note);
        }
    });

    PUBLISHED_NOTES.with_borrow_mut(|published| {
        let published_note = published.get(&note_id);
        if let Some(mut published_note) = published_note {
            published_note.updated_at = current_time;
            published.insert(note_id.clone(), published_note);
        }
    });
    Ok(())
}

fn home_handler(cntx: CanisterRouterContext) -> HttpResponse {
  let workspace_html = HANDLEBARS.with_borrow(|handlebars| {
    let context = WorkspaceContext {
      workspace_id: canister_self().to_text(),
    };
    handlebars.render("workspace", &context)
  }).expect("Failed to render workspace");
  HttpResponse::builder()
    .set_body(ByteBuf::from(workspace_html.as_bytes()))
    .set_headers(vec![("Content-Type".to_string(), "text/html".to_string()), ("Cache-Control".to_string(), "no-cache".to_string()), ("Access-Control-Allow-Origin".to_string(), "*".to_string())])
    .build()
}

#[ic_cdk::update(guard = "is_controller")]
fn set_owner_profile(user: UserProfile) -> Result<(), String> {
  OWNER_PROFILE.with_borrow_mut(|profile| {
    profile.set(user).expect("Failed to set owner profile");
  });
  Ok(())
}

fn note_handler(cntx: CanisterRouterContext) -> HttpResponse {
  let note_id = cntx.params.as_ref().unwrap().get("note_id").unwrap();
  let user_profile = OWNER_PROFILE.with_borrow(|profile| profile.get().clone());
  PUBLISHED_NOTES.with_borrow(|published| {
    if let Some(published_note) = published.get(note_id) {
      if let AccessType::Public = published_note.access_type {
        let note = NOTES.with(|notes| notes.borrow().get(note_id));
        if let Some(note) = note {
          let site = Site::new("Dotane".to_string(), "https://dotane.io".to_string());
          let author = Author::new(user_profile.name, user_profile.bio, user_profile.avatar, "https://dotane.io".to_string());
          let article = Article::new(note_id.clone(), note.title, note.content, note.created_at);
          let context = NoteTemplateContext::new(article, author, site);
          let note = HANDLEBARS.with_borrow_mut(|handlebars| {
            handlebars.render("note", &context)
          }).expect("Failed to render note");

          return HttpResponse::builder()
            .set_body(ByteBuf::from(note.as_bytes()))
            .set_headers(vec![("Content-Type".to_string(), "text/html".to_string())])
            .build()
        }
        
      }
    }

    HttpResponse::builder()
      .set_status(404)
      .build()
  })
}

fn setup_http_router() {
  ROUTER.with_borrow_mut(|router| {
    router.get("/", home_handler);
    router.post("/{note_id}", note_handler);
  });
}

fn setup_handlebars() {
  HANDLEBARS.with_borrow_mut(|handlebars| {
    // Register the formatDate helper
    handlebars.register_helper("formatDate", Box::new(format_date_helper));
    
    handlebars.register_template_string("note", NOTE_TEMPLATE).unwrap();
    handlebars.register_template_string("workspace", WORKSPACE_HTML).unwrap();
  });
}

fn format_date_helper(
    helper: &handlebars::Helper,
    _: &handlebars::Handlebars,
    _: &handlebars::Context,
    _: &mut handlebars::RenderContext,
    out: &mut dyn handlebars::Output,
) -> handlebars::HelperResult {
    // Get the timestamp (first parameter)
    let timestamp = helper.param(0)
        .ok_or_else(|| handlebars::RenderError::new("formatDate helper requires a timestamp parameter"))?
        .value()
        .as_u64()
        .ok_or_else(|| handlebars::RenderError::new("formatDate helper requires a numeric timestamp"))?;
    
    // Get the format string (second parameter)
    let format = helper.param(1)
        .ok_or_else(|| handlebars::RenderError::new("formatDate helper requires a format parameter"))?
        .value()
        .as_str()
        .ok_or_else(|| handlebars::RenderError::new("formatDate helper requires a string format"))?;
    
    // Convert milliseconds to seconds for chrono
    let timestamp_seconds = timestamp / 1000;
    
    // Parse the timestamp as UTC
    let datetime = chrono::DateTime::from_timestamp(timestamp_seconds as i64, 0)
        .ok_or_else(|| handlebars::RenderError::new("Invalid timestamp"))?;
    
    // Format the date according to the provided format
    let formatted_date = match format {
        "MMMM Do, YYYY" => datetime.format("%B %-d, %Y").to_string(),
        "MMMM D, YYYY" => datetime.format("%B %-d, %Y").to_string(),
        "MMM Do, YYYY" => datetime.format("%b %-d, %Y").to_string(),
        "MMM D, YYYY" => datetime.format("%b %-d, %Y").to_string(),
        "YYYY-MM-DD" => datetime.format("%Y-%m-%d").to_string(),
        "MM/DD/YYYY" => datetime.format("%m/%d/%Y").to_string(),
        "DD/MM/YYYY" => datetime.format("%d/%m/%Y").to_string(),
        "relative" => {
            let now = chrono::Utc::now();
            let duration = now.signed_duration_since(datetime);
            
            if duration.num_days() > 0 {
                format!("{} days ago", duration.num_days())
            } else if duration.num_hours() > 0 {
                format!("{} hours ago", duration.num_hours())
            } else if duration.num_minutes() > 0 {
                format!("{} minutes ago", duration.num_minutes())
            } else {
                "Just now".to_string()
            }
        },
        _ => datetime.format("%B %-d, %Y").to_string(), // Default format
    };
    
    out.write(&formatted_date)?;
    Ok(())
}

#[ic_cdk::query]
fn http_request(request: HttpRequest) -> HttpResponse {
   ROUTER.with_borrow(|router| {
    router.process(request, CallType::Query)
   })
}

#[ic_cdk::query]
fn is_workspace_premium_user() -> bool {
  api::is_controller(&ic_cdk::api::msg_caller())
}

export_candid!();
ic_asset_server::export_canister_methods!();

