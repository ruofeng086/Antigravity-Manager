// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(
    dead_code,
    unused_variables,
    unused_imports,
    unused_mut,
    unused_assignments
)]

fn main() {
    antigravity_tools_lib::run()
}
