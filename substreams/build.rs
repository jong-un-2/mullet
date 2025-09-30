use substreams_solana_codegen::Abigen;

fn main() -> Result<(), anyhow::Error> {
    Abigen::new("Mars", "abi/mars.json")
        .unwrap()
        .generate()
        .unwrap()
        .write_to_file("src/abi/mars.rs")
        .unwrap();

    prost_build::compile_protos(&["proto/vault_events.proto"], &["proto/"])?;
    
    Ok(())
}