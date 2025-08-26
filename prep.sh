# Copyright 2025 Declan Nnadozie
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     https://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

cargo build --release --target wasm32-unknown-unknown --package dotane_user_storage && cp target/wasm32-unknown-unknown/release/dotane_user_storage.wasm bin/ && candid-extractor target/wasm32-unknown-unknown/release/dotane_user_storage.wasm > src/dotane_user_storage/dotane_user_storage.did
cargo build --release --target wasm32-unknown-unknown --package dotane_ic_backend && candid-extractor target/wasm32-unknown-unknown/release/dotane_ic_backend.wasm > src/dotane_ic_backend/dotane_ic_backend.did
cargo build --release --target wasm32-unknown-unknown --package dotane_asset_storage && cp target/wasm32-unknown-unknown/release/dotane_asset_storage.wasm bin/ && candid-extractor target/wasm32-unknown-unknown/release/dotane_asset_storage.wasm > src/dotane_asset_storage/dotane_asset_storage.did

# dfx canister update-settings dotane_asset_storage --add-controller u6s2n-gx777-77774-qaaba-cai