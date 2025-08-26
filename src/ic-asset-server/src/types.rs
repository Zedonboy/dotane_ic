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

use std::borrow::Cow;

use candid::{decode_one, encode_one, CandidType, Deserialize};
use ic_stable_structures::{storable::Bound, Storable};
use serde::Serialize;

pub struct Asset {
    pub path: String,
    pub content: Vec<u8>,
    pub additional_headers: Vec<(String, String)>,
    pub content_type: String,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct AssetResponse {
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl Storable for AssetResponse {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Borrowed(&self.body)
    }
    
    fn into_bytes(self) -> Vec<u8> {
        let result = encode_one(self).expect("Failed to encode AssetResponse");
        result
    }
    
    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        decode_one(&bytes).expect("Failed to decode AssetResponse")
    }
    
    const BOUND: ic_stable_structures::storable::Bound = Bound::Unbounded;
}