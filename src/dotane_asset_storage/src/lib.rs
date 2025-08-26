use std::cell::RefCell;

use ic_cdk::{init, post_upgrade, pre_upgrade, query};
use ic_certified_stable_assets_server::StableState;
use ic_stable_structures::{memory_manager::{MemoryId, MemoryManager, VirtualMemory}, DefaultMemoryImpl, StableCell};

type Memory = VirtualMemory<DefaultMemoryImpl>;
thread_local! {
     // Memory manager for managing multiple stable memories
     static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
     RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static STABLE_STATE: RefCell<StableCell<StableState, Memory>> = RefCell::new(StableCell::new(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))), StableState::default()));
}
#[init]
pub fn init() {
    ic_certified_stable_assets_server::init();
}

#[pre_upgrade]
pub fn pre_upgrade() {
    let stable_state =ic_certified_stable_assets_server::pre_upgrade();
    STABLE_STATE.with_borrow_mut(|s| {
        s.set(stable_state);
    });
}

#[post_upgrade]
pub fn post_upgrade() {
    let memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));
    ic_certified_stable_assets_server::init_stable_store(memory);
    let stable_state = STABLE_STATE.with(|s| {
        let stable_state = s.borrow().get().clone();
        stable_state
    });
    ic_certified_stable_assets_server::post_upgrade(stable_state, None);
}


ic_certified_stable_assets_server::export_canister_methods!();
// Export candid interface
ic_cdk::export_candid!();
