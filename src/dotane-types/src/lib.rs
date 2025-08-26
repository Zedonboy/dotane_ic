use std::{borrow::Cow, collections::HashSet};

use candid::{CandidType, Decode, Encode};
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};

pub mod note_context;

#[derive(CandidType, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub author: String,
}

impl Storable for Note {
    fn to_bytes(&self) -> Cow<[u8]> {
        let data = Encode!(&self).unwrap();
        Cow::Owned(data)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, Note).unwrap()
    }
    
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
    
    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().into_owned()
    }

   
}

#[derive(CandidType, Clone, Debug, Deserialize)]
pub struct RestrictedAccessNotes {
    // pub note_id: String,
    pub access_link_expiry: Option<u64>,
    pub num_of_guests: u32,
    pub guests : HashSet<String>,
    // pub storage_canister: Option<String>,
}


#[derive(CandidType,Clone, Deserialize)]
pub enum AccessType {
    Public,
    Private,
    RestrictedAccess(RestrictedAccessNotes)
}

#[derive(Clone, CandidType, Deserialize)]
pub struct PublishedNote {
    pub access_type: AccessType,
    pub note_id: String,
    pub author: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub storage_canister: Option<String>,
}

impl Storable for PublishedNote {
    fn to_bytes(&self) -> Cow<[u8]> {
        let data = Encode!(&self).unwrap();
        Cow::Owned(data)
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, PublishedNote).unwrap()
    }
    
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().into_owned()
    }
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct ListNotesResponse {
    pub private_notes: Vec<Note>,
    pub published_notes: Vec<Note>,
}


#[derive(CandidType, Clone, Debug, Serialize, Deserialize, Default)]
pub struct UserProfile {
    pub name: String,
    pub email: String,
    pub bio: String,
    pub avatar: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub premium: bool,
    pub marked_public: bool
}

impl UserProfile  {
    pub fn anonymous() -> Self {
        Self {
            name: "Anonymous".to_string(),
            email: "".to_string(),
            bio: "".to_string(),
            avatar: "".to_string(),
            created_at: 0,
            updated_at: 0,
            premium: false,
            marked_public: false
        }
    }
}

impl Storable for UserProfile {
    fn to_bytes(&self) -> Cow<[u8]> {
        let data = Encode!(&self).unwrap();
        Cow::Owned(data)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, UserProfile).unwrap()
    }
    
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().into_owned()
    }
}
