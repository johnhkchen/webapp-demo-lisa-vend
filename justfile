# List available recipes.
default:
    @just --list

# Vendor the shared b28.dev clay kit into this repo.
sync-kit:
    mkdir -p styles/vendor
    curl -fsSL https://b28.dev/kit/b28-clay.css -o styles/vendor/b28-clay.css
    @echo "Synced styles/vendor/b28-clay.css"
