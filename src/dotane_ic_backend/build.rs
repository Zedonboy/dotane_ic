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

use std::{env, path::Path};

fn main() {
    let path = Path::new("../../.env");
    dotenv::from_path(path).expect("Error: .env file not found. Build cannot continue.");
    let asset_storage_canister_id = env::var("CANISTER_ID_DOTANE_ASSET_STORAGE");
    println!("cargo:rustc-check-cfg=cfg(network, values(\"ic\", \"local\"))");
    if asset_storage_canister_id.is_err() {
        panic!("Error: CANISTER_ID_DOTANE_ASSET_STORAGE environment variable not set. Build cannot continue.");
    }
    println!("cargo:rustc-env=CANISTER_ID_DOTANE_ASSET_STORAGE={}", asset_storage_canister_id.unwrap());

    let network = std::env::var("DFX_NETWORK").unwrap_or("local".to_string());

    println!("cargo:rustc-cfg=network=\"{}\"", network);
}

