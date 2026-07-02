fn main() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let oauth_path = manifest_dir.join("config/oauth.json");
    let example_path = manifest_dir.join("config/oauth.example.json");

    if !oauth_path.exists() {
        if let Err(err) = std::fs::copy(&example_path, &oauth_path) {
            panic!(
                "Missing {} — run `pnpm setup:oauth` or copy oauth.example.json manually: {err}",
                oauth_path.display()
            );
        }
        println!("cargo:warning=Created {} from oauth.example.json — paste your GitHub OAuth Client ID", oauth_path.display());
    }

    tauri_build::build()
}
