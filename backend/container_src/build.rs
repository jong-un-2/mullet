fn main() {
    prost_build::Config::new()
        .out_dir("src/pb")
        .compile_protos(&["proto/vault_events.proto"], &["proto/"])
        .expect("Failed to compile protos");
}
