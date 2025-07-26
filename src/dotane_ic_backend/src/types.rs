// Copyright 2025 Declan Nnadozie
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     https://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use candid::{CandidType, Decode, Encode, Principal};
use dotane_types::Note;
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, collections::{HashMap, HashSet}};


#[derive(CandidType, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct UserCanister {
    // canister_id -> associated_domain
    pub user_canisters: HashMap<String, Option<String>>,
}

impl Storable for UserCanister {
    fn to_bytes(&self) -> Cow<[u8]> {
        let data = Encode!(&self).unwrap();
        Cow::Owned(data)
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, UserCanister).unwrap()
    }
    
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}


// impl Storable for RestrictedAccessNotes {

//     fn to_bytes(&self) -> Cow<[u8]> {
//         let mut slice = vec![0u8; 1024 * 1024]; // 1MB buffer
//         let length = bincode::encode_into_slice(
//             self,
//             &mut slice,
//             bincode::config::standard()
//         ).unwrap();
//         Cow::Owned(slice[..length].to_vec())
//     }

//     fn from_bytes(bytes: Cow<[u8]>) -> Self {
//         bincode::decode_from_slice(&bytes, bincode::config::standard()).unwrap().0
//     }
    
//     const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
// }





#[derive(CandidType, Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct UserNotes {
    pub published_note_ids: HashSet<String>,
    pub private_notes: HashMap<String, Note>,
    pub restricted_access_notes: HashSet<String>,
}

impl Storable for UserNotes {
    fn to_bytes(&self) -> Cow<[u8]> {
        let data = Encode!(&self).unwrap();
        Cow::Owned(data)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, UserNotes).unwrap()
    }
    
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}


#[derive(CandidType, Serialize, Deserialize)]
pub struct CreateUserProfileRequest {
    pub name: String,
    pub email: String,
    pub bio: String,
    pub avatar: String,
    pub marked_public: bool
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct UpdateUserProfileRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub avatar: Option<String>,
    pub marked_public: Option<bool>,
}

#[derive(CandidType, Deserialize)]
pub struct Workspace {
    pub canister_id: String,
    pub domain: Option<String>,
}