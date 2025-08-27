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

// ICRC Ledger Canister IDs (you'll need to replace these with actual canister IDs)
export const USDC_LEDGER_CANISTER_ID = "xevnm-gaaaa-aaaar-qafnq-cai" // Replace with actual USDT ledger canister ID
export const USDT_LEDGER_CANISTER_ID = "cngnf-vqaaa-aaaar-qag4q-cai" // Replace with actual USDC ledger canister ID
export const DOTANE_AI_SERVER = process.env.DFX_NETWORK === "local" ? "http://localhost:3010" : "https://dotane-ai-server-z3on4.ondigitalocean.app"
export const ASSETS_CANISTER_ID = process.env.CANISTER_ID_DOTANE_ASSET_STORAGE as string