//! This module declares canister methods expected by the assets canister client.
pub mod asset_certification;
pub mod evidence;
pub mod state_machine;
pub mod types;
mod url_decode;

#[cfg(test)]
mod tests;

pub use crate::state_machine::StableState;
use crate::{
    asset_certification::types::http::{
        CallbackFunc, HttpRequest, HttpResponse, StreamingCallbackHttpResponse,
        StreamingCallbackToken,
    },
    state_machine::{init_asset_cache, AssetDetails, CertifiedTree, EncodedAsset, State, VMemory},
    types::*,
};
use asset_certification::types::{certification::AssetKey, rc_bytes::RcBytes};
use candid::Principal;
use ic_cdk::api::{canister_self, certified_data_set, data_certificate, debug_print, msg_caller, time, trap};
use serde_bytes::ByteBuf;
use std::cell::RefCell;

#[cfg(target_arch = "wasm32")]
#[link_section = "icp:public supported_certificate_versions"]
pub static SUPPORTED_CERTIFICATE_VERSIONS: [u8; 3] = *b"1,2";

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

pub fn api_version() -> u16 {
    1
}

pub fn authorize(other: Principal) {
    STATE.with(|s| s.borrow_mut().grant_permission(other, &Permission::Commit))
}

pub fn grant_permission(arg: GrantPermissionArguments) {
    STATE.with(|s| {
        s.borrow_mut()
            .grant_permission(arg.to_principal, &arg.permission)
    })
}

pub fn init_stable_store(memory: VMemory ) {
    init_asset_cache(memory);
}

pub async fn validate_grant_permission(arg: GrantPermissionArguments) -> Result<String, String> {
    Ok(format!(
        "grant {} permission to principal {}",
        arg.permission, arg.to_principal
    ))
}

pub async fn deauthorize(other: Principal) {
    let check_access_result = if other == msg_caller() {
        // this isn't "ManagePermissions" because these legacy methods only
        // deal with the Commit permission
        has_permission_or_is_controller(&Permission::Commit)
    } else {
        is_controller()
    };
    match check_access_result {
        Err(e) => trap(&e),
        Ok(_) => STATE.with(|s| s.borrow_mut().revoke_permission(other, &Permission::Commit)),
    }
}

pub async fn revoke_permission(arg: RevokePermissionArguments) {
    let check_access_result = if arg.of_principal == msg_caller() {
        has_permission_or_is_controller(&arg.permission)
    } else {
        has_permission_or_is_controller(&Permission::ManagePermissions)
    };
    match check_access_result {
        Err(e) => trap(&e),
        Ok(_) => STATE.with(|s| {
            s.borrow_mut()
                .revoke_permission(arg.of_principal, &arg.permission)
        }),
    }
}

pub async fn validate_revoke_permission(arg: RevokePermissionArguments) -> Result<String, String> {
    Ok(format!(
        "revoke {} permission from principal {}",
        arg.permission, arg.of_principal
    ))
}

pub fn list_authorized() -> Vec<Principal> {
    STATE.with(|s| s.borrow().list_permitted(&Permission::Commit).iter().cloned().collect())
}

pub fn list_permitted(arg: ListPermittedArguments) -> Vec<Principal> {
    STATE.with(|s| s.borrow().list_permitted(&arg.permission).iter().cloned().collect())
}

pub async fn take_ownership() {
    let caller = msg_caller();
    STATE.with(|s| s.borrow_mut().take_ownership(caller))
}

pub async fn validate_take_ownership() -> Result<String, String> {
    Ok("revoke all permissions, then gives the caller Commit permissions".to_string())
}

pub fn retrieve(key: AssetKey) -> RcBytes {
    STATE.with(|s| match s.borrow().retrieve(&key) {
        Ok(bytes) => bytes,
        Err(msg) => trap(&msg),
    })
}

pub fn store(arg: StoreArg) {
    debug_print(&format!("storing asset"));
    STATE.with(move |s| {
        if let Err(msg) = s.borrow_mut().store(arg, time()) {
            trap(&msg);
        }
        certified_data_set(&s.borrow().root_hash());
    });
}

pub fn create_batch() -> CreateBatchResponse {
    STATE.with(|s| match s.borrow_mut().create_batch(time()) {
        Ok(batch_id) => CreateBatchResponse { batch_id },
        Err(msg) => trap(&msg),
    })
}

pub fn create_chunk(arg: CreateChunkArg) -> CreateChunkResponse {
    STATE.with(|s| match s.borrow_mut().create_chunk(arg, time()) {
        Ok(chunk_id) => CreateChunkResponse { chunk_id },
        Err(msg) => trap(&msg),
    })
}

pub fn create_asset(arg: CreateAssetArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().create_asset(arg) {
            trap(&msg);
        }
        certified_data_set(&s.borrow().root_hash());
    })
}

pub fn set_asset_content(arg: SetAssetContentArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().set_asset_content(arg, time()) {
            trap(&msg);
        }
        certified_data_set(&s.borrow().root_hash());
    })
}

pub fn unset_asset_content(arg: UnsetAssetContentArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().unset_asset_content(arg) {
            trap(&msg);
        }
        certified_data_set(&s.borrow().root_hash());
    })
}

pub fn delete_asset(arg: DeleteAssetArguments) {
    STATE.with(|s| {
        s.borrow_mut().delete_asset(arg);
        certified_data_set(&s.borrow().root_hash());
    });
}

pub fn clear() {
    STATE.with(|s| {
        s.borrow_mut().clear();
        certified_data_set(&s.borrow().root_hash());
    });
}

pub fn commit_batch(arg: CommitBatchArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().commit_batch(arg, time()) {
            trap(&msg);
        }
        certified_data_set(&s.borrow().root_hash());
    });
}

pub fn propose_commit_batch(arg: CommitBatchArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().propose_commit_batch(arg) {
            trap(&msg);
        }
    });
}

pub fn compute_evidence(arg: ComputeEvidenceArguments) -> Option<ByteBuf> {
    STATE.with(|s| match s.borrow_mut().compute_evidence(arg) {
        Err(msg) => trap(&msg),
        Ok(maybe_evidence) => maybe_evidence,
    })
}

pub fn commit_proposed_batch(arg: CommitProposedBatchArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().commit_proposed_batch(arg, time()) {
            trap(&msg);
        }
        certified_data_set(&s.borrow().root_hash());
    });
}

pub fn validate_commit_proposed_batch(arg: CommitProposedBatchArguments) -> Result<String, String> {
    STATE.with(|s| s.borrow_mut().validate_commit_proposed_batch(arg))
}

pub fn delete_batch(arg: DeleteBatchArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().delete_batch(arg) {
            trap(&msg);
        }
    });
}

pub fn get(arg: GetArg) -> EncodedAsset {
    STATE.with(|s| match s.borrow().get(arg) {
        Ok(asset) => asset,
        Err(msg) => trap(&msg),
    })
}

pub fn get_chunk(arg: GetChunkArg) -> GetChunkResponse {
    STATE.with(|s| match s.borrow().get_chunk(arg) {
        Ok(content) => GetChunkResponse { content },
        Err(msg) => trap(&msg),
    })
}

pub fn list() -> Vec<AssetDetails> {
    STATE.with(|s| s.borrow().list_assets())
}

pub fn certified_tree() -> CertifiedTree {
    let certificate = data_certificate().unwrap_or_else(|| trap("no data certificate available"));

    STATE.with(|s| s.borrow().certified_tree(&certificate))
}


pub fn get_asset_properties(key: AssetKey) -> AssetProperties {
    STATE.with(|s| {
        s.borrow()
            .get_asset_properties(key)
            .unwrap_or_else(|msg| trap(&msg))
    })
}

pub fn set_asset_properties(arg: SetAssetPropertiesArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().set_asset_properties(arg) {
            trap(&msg);
        }
    })
}

pub fn get_configuration() -> ConfigurationResponse {
    STATE.with(|s| s.borrow().get_configuration())
}

pub fn configure(arg: ConfigureArguments) {
    STATE.with(|s| s.borrow_mut().configure(arg))
}

pub fn validate_configure(arg: ConfigureArguments) -> Result<String, String> {
    Ok(format!("configure: {:?}", arg))
}

pub fn can(permission: Permission) -> Result<(), String> {
    STATE.with(|s| {
        s.borrow()
            .can(&msg_caller(), &permission)
            .then_some(())
            .ok_or_else(|| format!("Caller does not have {} permission", permission))
    })
}

pub fn can_commit() -> Result<(), String> {
    can(Permission::Commit)
}

pub fn can_prepare() -> Result<(), String> {
    can(Permission::Prepare)
}

pub fn has_permission_or_is_controller(permission: &Permission) -> Result<(), String> {
    let caller = msg_caller();
    let has_permission = STATE.with(|s| s.borrow().has_permission(&caller, permission));
    let is_controller = ic_cdk::api::is_controller(&msg_caller());
    if has_permission || is_controller {
        Ok(())
    } else {
        Err(format!(
            "Caller does not have {} permission and is not a controller.",
            permission
        ))
    }
}

pub fn is_manager_or_controller() -> Result<(), String> {
    has_permission_or_is_controller(&Permission::ManagePermissions)
}

pub fn is_controller() -> Result<(), String> {
    let caller = msg_caller();
    if ic_cdk::api::is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not a controller.".to_string())
    }
}

pub fn http_request(req: HttpRequest) -> Result<HttpResponse, String> {
    let certificate = data_certificate().unwrap_or_else(|| trap("no data certificate available"));

    STATE.with(|s| {
        s.borrow().http_request(
            req,
            &certificate,
            CallbackFunc::new(canister_self(), "http_request_streaming_callback".to_string()),
        )
    })
}

pub fn get_asset_by_path(path: String) -> Result<HttpResponse, String> {
    let certificate = data_certificate().unwrap_or_else(|| trap("no data certificate available"));

    STATE.with(|s| {
        let req = HttpRequest {
            method: "GET".to_string(),
            url: path,
            headers: vec![],
            body: ByteBuf::new(),
            certificate_version: None,
        };
        
        s.borrow().http_request(
            req,
            &certificate,
            CallbackFunc::new(canister_self(), "http_request_streaming_callback".to_string()),
        )
    })
}

pub fn remove_asset_by_path(path: String) -> Result<(), String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let key = AssetKey::from(path);
        
        state.delete_asset(DeleteAssetArguments { key });
        certified_data_set(&state.root_hash());
        Ok(())
    })
}

pub fn http_request_streaming_callback(token: StreamingCallbackToken) -> StreamingCallbackHttpResponse {
    STATE.with(|s| {
        s.borrow()
            .http_request_streaming_callback(token)
            .unwrap_or_else(|msg| trap(&msg))
    })
}

/// Save an asset directly during runtime with the specified path and content
/// This function is intended for users to programmatically add assets at runtime
pub fn save_asset(
    path: String,
    content: Vec<u8>,
    content_type: String,
    content_encoding: Option<String>,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<(), String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        match state.save_asset_now(path, content, content_type, content_encoding, headers) {
            Ok(_) => {
                certified_data_set(&state.root_hash());
                Ok(())
            },
            Err(e) => Err(e)
        }
    })
}

pub fn init() {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.clear();
        s.grant_permission(msg_caller(), &Permission::ManagePermissions);
    });
}

pub fn pre_upgrade() -> StableState {
    STATE.with(|s| s.take().into())
}

pub fn post_upgrade(stable_state: StableState, args: Option<AssetCanisterArgs>) {
    let set_permissions = args.and_then(|args| {
        let AssetCanisterArgs::Upgrade(UpgradeArgs { set_permissions }) = args else {ic_cdk::trap("Cannot upgrade the canister with an Init argument. Please provide an Upgrade argument.")};
        set_permissions
    });

    STATE.with(|s| {
        *s.borrow_mut() = State::from(stable_state);
        certified_data_set(&s.borrow().root_hash());
        if let Some(set_permissions) = set_permissions {
            s.borrow_mut().set_permissions(set_permissions);
        }
    });
}

/// Exports the whole asset canister interface, but does not handle init/pre_/post_upgrade for initial configuration or state persistence across upgrades.
///
/// This macro exports all the canister methods needed for a complete asset canister implementation.
/// Users need to handle init/pre_upgrade/post_upgrade methods separately in their canister.
/// 
/// Note: This macro does NOT export http_request or http_request_streaming_callback methods.
/// Users should implement these methods themselves using the exported functions from this crate.
#[macro_export]
macro_rules! export_canister_methods {
    () => {
        use $crate::asset_certification;
        use $crate::state_machine;
        use $crate::types as server_types;

        use $crate::can_commit as __ic_certified_assets_can_commit;
        use $crate::can_prepare as __ic_certified_assets_can_prepare;
        use $crate::is_controller as __ic_certified_assets_is_controller;
        use $crate::is_manager_or_controller as __ic_certified_assets_is_manager_or_controller;
        use $crate::asset_certification::types::http::HttpRequest;
        use $crate::asset_certification::types::http::HttpResponse;
        use $crate::asset_certification::types::http::StreamingCallbackToken;
        use $crate::asset_certification::types::http::StreamingCallbackHttpResponse;


        #[cfg(target_arch = "wasm32")]
        #[link_section = "icp:public supported_certificate_versions"]
        static CERTIFICATE_VERSIONS: [u8; 3] = $crate::SUPPORTED_CERTIFICATE_VERSIONS;

        // Query methods
        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn api_version() -> u16 {
            $crate::api_version()
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn retrieve(
            key: asset_certification::types::certification::AssetKey,
        ) -> asset_certification::types::rc_bytes::RcBytes {
            $crate::retrieve(key)
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn get(arg: server_types::GetArg) -> state_machine::EncodedAsset {
            $crate::get(arg)
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn http_request(req: HttpRequest) -> Result<HttpResponse, String> {
            $crate::http_request(req)
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn http_request_streaming_callback(token: StreamingCallbackToken) -> StreamingCallbackHttpResponse {
            $crate::http_request_streaming_callback(token)
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn get_chunk(arg: server_types::GetChunkArg) -> server_types::GetChunkResponse {
            $crate::get_chunk(arg)
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn list() -> Vec<state_machine::AssetDetails> {
            $crate::list()
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn certified_tree() -> state_machine::CertifiedTree {
            $crate::certified_tree()
        }

        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn get_asset_properties(
            key: asset_certification::types::certification::AssetKey,
        ) -> server_types::AssetProperties {
            $crate::get_asset_properties(key)
        }

        // Update methods
        #[ic_cdk::update(guard = "__ic_certified_assets_is_manager_or_controller")]
        #[candid::candid_method(update)]
        fn authorize(other: candid::Principal) {
            $crate::authorize(other)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_is_manager_or_controller")]
        #[candid::candid_method(update)]
        fn grant_permission(arg: server_types::GrantPermissionArguments) {
            $crate::grant_permission(arg)
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        async fn validate_grant_permission(
            arg: server_types::GrantPermissionArguments,
        ) -> Result<String, String> {
            $crate::validate_grant_permission(arg).await
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        async fn deauthorize(other: candid::Principal) {
            $crate::deauthorize(other).await
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        async fn revoke_permission(arg: server_types::RevokePermissionArguments) {
            $crate::revoke_permission(arg).await
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        async fn validate_revoke_permission(
            arg: server_types::RevokePermissionArguments,
        ) -> Result<String, String> {
            $crate::validate_revoke_permission(arg).await
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        fn list_authorized() -> Vec<candid::Principal> {
            $crate::list_authorized()
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        fn list_permitted(arg: server_types::ListPermittedArguments) -> Vec<candid::Principal> {
            $crate::list_permitted(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_is_controller")]
        #[candid::candid_method(update)]
        async fn take_ownership() {
            $crate::take_ownership().await
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        async fn validate_take_ownership() -> Result<String, String> {
            $crate::validate_take_ownership().await
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn store(arg: server_types::StoreArg) {
            $crate::store(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_prepare")]
        #[candid::candid_method(update)]
        fn create_batch() -> server_types::CreateBatchResponse {
            $crate::create_batch()
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_prepare")]
        #[candid::candid_method(update)]
        fn create_chunk(arg: server_types::CreateChunkArg) -> server_types::CreateChunkResponse {
            $crate::create_chunk(arg)
        }


        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn create_asset(arg: server_types::CreateAssetArguments) {
            $crate::create_asset(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn set_asset_content(arg: server_types::SetAssetContentArguments) {
            $crate::set_asset_content(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn unset_asset_content(arg: server_types::UnsetAssetContentArguments) {
            $crate::unset_asset_content(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn delete_asset(arg: server_types::DeleteAssetArguments) {
            $crate::delete_asset(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn clear() {
            $crate::clear()
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn commit_batch(arg: server_types::CommitBatchArguments) {
            $crate::commit_batch(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_prepare")]
        #[candid::candid_method(update)]
        fn propose_commit_batch(arg: server_types::CommitBatchArguments) {
            $crate::propose_commit_batch(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_prepare")]
        #[candid::candid_method(update)]
        fn compute_evidence(
            arg: server_types::ComputeEvidenceArguments,
        ) -> Option<serde_bytes::ByteBuf> {
            $crate::compute_evidence(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn commit_proposed_batch(arg: server_types::CommitProposedBatchArguments) {
            $crate::commit_proposed_batch(arg)
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        fn validate_commit_proposed_batch(
            arg: server_types::CommitProposedBatchArguments,
        ) -> Result<String, String> {
            $crate::validate_commit_proposed_batch(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_prepare")]
        #[candid::candid_method(update)]
        fn delete_batch(arg: server_types::DeleteBatchArguments) {
            $crate::delete_batch(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn set_asset_properties(arg: server_types::SetAssetPropertiesArguments) {
            $crate::set_asset_properties(arg)
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_prepare")]
        #[candid::candid_method(update)]
        fn get_configuration() -> server_types::ConfigurationResponse {
            $crate::get_configuration()
        }

        #[ic_cdk::update(guard = "__ic_certified_assets_can_commit")]
        #[candid::candid_method(update)]
        fn configure(arg: server_types::ConfigureArguments) {
            $crate::configure(arg)
        }

        #[ic_cdk::update]
        #[candid::candid_method(update)]
        fn validate_configure(arg: server_types::ConfigureArguments) -> Result<String, String> {
            $crate::validate_configure(arg)
        }
    };
}

#[test]
fn candid_interface_compatibility() {
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::PathBuf;

    candid::export_service!();
    let new_interface = __export_service();

    let old_interface =
        PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("assets.did");

    println!("Exported interface: {}", new_interface);

    service_compatible(
        CandidSource::Text(&new_interface),
        CandidSource::File(old_interface.as_path()),
    )
    .expect("The assets canister interface is not compatible with the assets.did file");
}