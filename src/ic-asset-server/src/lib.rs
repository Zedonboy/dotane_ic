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

use std::{cell::{Ref, RefCell}, collections::HashMap};
use ic_cdk::api::{certified_data_set, data_certificate};
use ic_http_certification::{utils::add_v2_certificate_header, DefaultCelBuilder, DefaultResponseCertification, DefaultResponseOnlyCelExpression, HeaderField, HttpCertification, HttpCertificationPath, HttpCertificationTree, HttpCertificationTreeEntry, HttpResponse, StatusCode, CERTIFICATE_EXPRESSION_HEADER_NAME};
use ic_stable_structures::{memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap};
use lazy_static::lazy_static;

use crate::types::{Asset, AssetResponse};

type VMemory = VirtualMemory<DefaultMemoryImpl>;
pub mod types;

lazy_static! {
    static ref CEL_EXPR: DefaultResponseOnlyCelExpression<'static> = DefaultCelBuilder::response_only_certification()
    .with_response_certification(DefaultResponseCertification::response_header_exclusions(
        vec![],
    ))
    .build();
}

thread_local! {
    
    // key is request path and value is content
    static ASSET_STORE: RefCell<Option<StableBTreeMap<String, AssetResponse, VMemory>>> = RefCell::new(None);
    static HTTP_TREE: RefCell<HttpCertificationTree> = RefCell::new(HttpCertificationTree::default());
    static ASSET_CERT: RefCell<HashMap<String, HttpCertification>> = RefCell::new(HashMap::new());
}

pub fn init_store_memory(memory : VMemory) {
    ASSET_STORE.set(Some(StableBTreeMap::init(memory)));
}

fn get_asset_headers(
    additional_headers: Vec<HeaderField>,
    content_length: usize,
    cel_expr: String,
) -> Vec<(String, String)> {
    // set up the default headers and include additional headers provided by the caller
    let mut headers = vec![
        // ("x-frame-options".to_string(), "DENY".to_string()),
        // ("x-content-type-options".to_string(), "nosniff".to_string()),
        // ("referrer-policy".to_string(), "no-referrer".to_string()),
        // ("cross-origin-embedder-policy".to_string(), "require-corp".to_string()),
        // ("cross-origin-opener-policy".to_string(), "same-origin".to_string()),
        ("content-length".to_string(), content_length.to_string()),
        (CERTIFICATE_EXPRESSION_HEADER_NAME.to_string(), cel_expr),
    ];
    headers.extend(additional_headers);

    headers
}

pub fn add_asset(asset: types::Asset) {
   let content = asset.content;
   let content_length = content.len();

   // we are going to certify this asset
   // create the response

   let extended_headers = get_asset_headers(asset.additional_headers, content_length, CEL_EXPR.to_string());

   let response = HttpResponse::builder()
   .with_body(content)
   .with_status_code(StatusCode::OK)
   .with_headers(extended_headers)
   .build();

   // certify the response
   let certification = HttpCertification::response_only(&CEL_EXPR, &response, None).unwrap();

   let cert_path = HttpCertificationPath::exact(asset.path.clone());


   HTTP_TREE.with_borrow_mut(|http_tree| {
       // add the certification to the certification tree
       http_tree.insert(&HttpCertificationTreeEntry::new(
           cert_path,
           &certification,
       ));
   });

   ASSET_CERT.with_borrow_mut(|cert_map| {
    cert_map.insert(asset.path.clone(), certification);
   });

   ASSET_STORE.with_borrow_mut(|store_opt| {
    let store = store_opt.as_mut().unwrap();
    store.insert(asset.path.clone(), AssetResponse {
        headers: response.headers().to_vec(),
        body: response.body().to_vec(),
    });
   });

   update_certified_data();

}

pub fn post_upgrade() {
    ASSET_STORE.with_borrow(|store_opt| {
        let store = store_opt.as_ref().unwrap();
        for entry in store.iter() {
            let asset_response = entry.value();
            let response = HttpResponse::builder()
            .with_headers(asset_response.headers)
            .with_body(asset_response.body)
            .build();

            let certification = HttpCertification::response_only(&CEL_EXPR, &response, None).unwrap();

            let cert_path = HttpCertificationPath::exact(entry.key());

            HTTP_TREE.with_borrow_mut(|http_tree| {
                http_tree.insert(&HttpCertificationTreeEntry::new(cert_path, &certification));
            });

            ASSET_CERT.with_borrow_mut(|cert_map| {
                cert_map.insert(entry.key().to_string(), certification);
            });
        }
    });

    update_certified_data();
}

pub fn serve_asset(path: String) -> HttpResponse<'static> {
   ASSET_CERT.with_borrow(|cert_map| {

    let asset_response = ASSET_STORE.with_borrow(|store_opt| {
        let store = store_opt.as_ref().unwrap();
        store.get(&path).or_else(|| store.get(&"/fallback".to_string()))
    });

    let asset_response = asset_response.expect("No response found");

    let mut response = HttpResponse::builder()
    .with_headers(asset_response.headers)
    .with_body(asset_response.body)
    .build();

    if let Some(cert) = cert_map.get(&path) {
        HTTP_TREE.with_borrow(|http_tree| {
            let asset_tree_path = HttpCertificationPath::exact(&path);

             add_v2_certificate_header(
                    &data_certificate().expect("No data certificate available"),
                    &mut response,
                    &http_tree
                        .witness(
                            &HttpCertificationTreeEntry::new(&asset_tree_path, cert),
                            &path,
                        )
                        .unwrap(),
                    &asset_tree_path.to_expr_path(),
                );
        })
    };

    response
   })
}

pub fn set_fallback_asset(mut asset: Asset) {
    asset.path = "/fallback".to_string();
    add_asset(asset);
}

pub fn delete_asset(path: String) {
    ASSET_CERT.with_borrow_mut(|cert_map| {
        cert_map.remove(&path);
    });

    ASSET_STORE.with_borrow_mut(|store_opt| {   
        let store = store_opt.as_mut().unwrap();
        store.remove(&path);
    });

    HTTP_TREE.with_borrow_mut(|http_tree| {
        let asset_tree_path = HttpCertificationPath::exact(&path);
        http_tree.delete_by_path(&asset_tree_path);
    });

    update_certified_data();
}

fn update_certified_data() {
    HTTP_TREE.with_borrow(|http_tree| {
        certified_data_set(&http_tree.root_hash());
    });
}