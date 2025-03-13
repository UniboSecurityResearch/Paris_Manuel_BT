
#[test_only]
module lottery::lottery_tests {
    // uncomment this line to import the module
    use lottery::lottery;

    const ENotImplemented: u64 = 0;

    #[test]
    fun test_lottery() {
        // let mut ctx = tx_context::dummy();
        let uuid = b"d1035b95-bfd5-433b-934f-d61d9a39a8b2".to_string();
        assert!(lottery::check_UUID(uuid));
        // pass
    }

    #[test, expected_failure(abort_code = ::lottery::lottery_tests::ENotImplemented)]
    fun test_lottery_fail() {
        abort ENotImplemented
    }
}

