#![cfg(feature = "test-bpf")]

use solana_program_test::tokio;
use genius_test_utils::initialize_util::InitializeInstruction;
use genius_test_utils::*;
use genius::state::GlobalState;

#[tokio::test]
async fn should_initialize_market() {
    let mut testenv = TestEnv::new(vec![]).await;
    InitializeInstruction::execute(None, None, &get_wallet(), &mut testenv)
        .await
        .expect_transaction("Failed to initialize market with default config");

    let global_state_address = GlobalState::generate_pda();

    let global_state: GlobalState =
        testenv.fetch_account(global_state_address).await;

    assert_eq!(
        global_state.rebalance_threshold,
        70
    );   
}
