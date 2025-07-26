use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Main context data structure for the note/article Handlebars template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteTemplateContext {
    /// Article/note data
    pub article: Article,
    /// Author information
    pub author: Author,
    /// Site configuration and metadata
    pub site: Site,
    /// Optional comments section (currently commented out in template)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comments: Option<Vec<Comment>>,
    /// Optional related articles section (currently commented out in template)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub related_articles: Option<Vec<RelatedArticle>>,
    /// Optional newsletter configuration (currently commented out in template)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub newsletter: Option<Newsletter>,
}

/// Article/note data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    /// Unique identifier for the article
    pub id: String,
    /// Article title
    pub title: String,
    /// Article content in HTML format (BlockNote.js rendered)
    pub content: String,
    /// Publication date
    pub published_at: u64,
    /// Article tags/categories
    #[serde(default)]
    pub tags: Vec<String>,
    /// Whether the article is trending
    #[serde(default)]
    pub is_trending: bool,
    /// Whether this is an InfoFi knowledge asset
    #[serde(default)]
    pub is_info_fi_asset: bool,
    /// Price for InfoFi assets (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<String>,
    /// Number of likes
    #[serde(default)]
    pub likes: u32,
    /// Read time estimate
    #[serde(skip_serializing_if = "Option::is_none")]
    pub read_time: Option<String>,
    /// Featured image URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_image: Option<String>,
    /// Article excerpt/summary
    #[serde(skip_serializing_if = "Option::is_none")]
    pub excerpt: Option<String>,
    /// Article URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Author information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Author {
    /// Author's name
    pub name: String,
    /// Author's bio or title
    pub bio: String,
    /// Author's avatar image URL
    pub avatar: String,
    /// Author's profile URL
    pub profile_url: String,
}

/// Site configuration and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Site {
    /// Site name
    pub name: String,
    /// Site URL
    pub url: String,
    /// Privacy policy URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub privacy_policy_url: Option<String>,
    /// Terms of service URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terms_of_service_url: Option<String>,
    /// Site description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Site logo URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
}

/// Comment structure (for future use)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    /// Comment ID
    pub id: String,
    /// Comment content
    pub content: String,
    /// Comment creation date
    pub created_at: u64,
    /// Comment author
    pub author: CommentAuthor,
    /// Whether this is a reply to another comment
    #[serde(default)]
    pub is_reply: bool,
    /// Parent comment ID (if this is a reply)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
}

/// Comment author structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentAuthor {
    /// Author's name
    pub name: String,
    /// Author's avatar image URL
    pub avatar: String,
}

/// Related article structure (for future use)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelatedArticle {
    /// Article ID
    pub id: String,
    /// Article title
    pub title: String,
    /// Article excerpt
    pub excerpt: String,
    /// Article URL
    pub url: String,
    /// Featured image URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_image: Option<String>,
    /// Read time estimate
    pub read_time: String,
    /// Price for InfoFi assets (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<String>,
}

/// Newsletter configuration (for future use)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Newsletter {
    /// Whether newsletter is enabled
    pub enabled: bool,
    /// Newsletter title
    pub title: String,
    /// Newsletter description
    pub description: String,
    /// Newsletter form action URL
    pub action_url: String,
}

/// Helper functions for creating template context
impl NoteTemplateContext {
    /// Create a new template context with required fields
    pub fn new(article: Article, author: Author, site: Site) -> Self {
        Self {
            article,
            author,
            site,
            comments: None,
            related_articles: None,
            newsletter: None,
        }
    }

    /// Add comments to the context
    pub fn with_comments(mut self, comments: Vec<Comment>) -> Self {
        self.comments = Some(comments);
        self
    }

    /// Add related articles to the context
    pub fn with_related_articles(mut self, related_articles: Vec<RelatedArticle>) -> Self {
        self.related_articles = Some(related_articles);
        self
    }

    /// Add newsletter configuration to the context
    pub fn with_newsletter(mut self, newsletter: Newsletter) -> Self {
        self.newsletter = Some(newsletter);
        self
    }
}

/// Helper functions for Article
impl Article {
    /// Create a new article with required fields
    pub fn new(id: String, title: String, content: String, published_at: u64) -> Self {
        Self {
            id,
            title,
            content,
            published_at,
            tags: Vec::new(),
            is_trending: false,
            is_info_fi_asset: false,
            price: None,
            likes: 0,
            read_time: None,
            featured_image: None,
            excerpt: None,
            url: None,
        }
    }

    /// Add tags to the article
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    /// Set the article as trending
    pub fn set_trending(mut self) -> Self {
        self.is_trending = true;
        self
    }

    /// Set the article as an InfoFi asset
    pub fn set_info_fi_asset(mut self) -> Self {
        self.is_info_fi_asset = true;
        self
    }

    /// Set the price for InfoFi assets
    pub fn with_price(mut self, price: String) -> Self {
        self.price = Some(price);
        self
    }

    /// Set the number of likes
    pub fn with_likes(mut self, likes: u32) -> Self {
        self.likes = likes;
        self
    }

    /// Set the read time estimate
    pub fn with_read_time(mut self, read_time: String) -> Self {
        self.read_time = Some(read_time);
        self
    }

    /// Set the featured image URL
    pub fn with_featured_image(mut self, featured_image: String) -> Self {
        self.featured_image = Some(featured_image);
        self
    }

    /// Set the article excerpt
    pub fn with_excerpt(mut self, excerpt: String) -> Self {
        self.excerpt = Some(excerpt);
        self
    }

    /// Set the article URL
    pub fn with_url(mut self, url: String) -> Self {
        self.url = Some(url);
        self
    }
}

/// Helper functions for Author
impl Author {
    /// Create a new author with required fields
    pub fn new(name: String, bio: String, avatar: String, profile_url: String) -> Self {
        Self {
            name,
            bio,
            avatar,
            profile_url,
        }
    }
}

/// Helper functions for Site
impl Site {
    /// Create a new site with required fields
    pub fn new(name: String, url: String) -> Self {
        Self {
            name,
            url,
            privacy_policy_url: None,
            terms_of_service_url: None,
            description: None,
            logo_url: None,
        }
    }

    /// Add privacy policy URL
    pub fn with_privacy_policy(mut self, privacy_policy_url: String) -> Self {
        self.privacy_policy_url = Some(privacy_policy_url);
        self
    }

    /// Add terms of service URL
    pub fn with_terms_of_service(mut self, terms_of_service_url: String) -> Self {
        self.terms_of_service_url = Some(terms_of_service_url);
        self
    }

    /// Add site description
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    /// Add site logo URL
    pub fn with_logo(mut self, logo_url: String) -> Self {
        self.logo_url = Some(logo_url);
        self
    }
}

// Example usage and test data
// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn test_create_basic_template_context() {
//         let article = Article::new(
//             "article-123".to_string(),
//             "Sample Article Title".to_string(),
//             "<p>This is the article content in HTML format.</p>".to_string(),
//             ic_cdk::api::time(),
//         );

//         let author = Author::new(
//             "John Doe".to_string(),
//             "Software Engineer and Tech Writer".to_string(),
//             "https://example.com/avatar.jpg".to_string(),
//             "https://example.com/profile".to_string(),
//         );

//         let site = Site::new(
//             "Dotane.io".to_string(),
//             "https://dotane.io".to_string(),
//         );

//         let context = NoteTemplateContext::new(article, author, site);

//         assert_eq!(context.article.title, "Sample Article Title");
//         assert_eq!(context.author.name, "John Doe");
//         assert_eq!(context.site.name, "Dotane.io");
//         assert!(context.comments.is_none());
//         assert!(context.related_articles.is_none());
//         assert!(context.newsletter.is_none());
//     }

//     #[test]
//     fn test_article_builder_pattern() {
//         let article = Article::new(
//             "article-123".to_string(),
//             "Sample Article".to_string(),
//             "<p>Content</p>".to_string(),
//             ic_cdk::api::time(),
//         )
//         .with_tags(vec!["tech".to_string(), "programming".to_string()])
//         .set_trending()
//         .with_likes(42)
//         .with_read_time("5 min read".to_string());

//         assert_eq!(article.tags.len(), 2);
//         assert!(article.is_trending);
//         assert_eq!(article.likes, 42);
//         assert_eq!(article.read_time, Some("5 min read".to_string()));
//     }

//     #[test]
//     fn test_context_with_optional_sections() {
//         let article = Article::new(
//             "article-123".to_string(),
//             "Sample Article".to_string(),
//             "<p>Content</p>".to_string(),
//             ic_cdk::api::time(),
//         );

//         let author = Author::new(
//             "John Doe".to_string(),
//             "Author".to_string(),
//             "avatar.jpg".to_string(),
//             "profile".to_string(),
//         );

//         let site = Site::new("Site".to_string(), "https://site.com".to_string());

//         let comments = vec![Comment {
//             id: "comment-1".to_string(),
//             content: "Great article!".to_string(),
//             created_at: ic_cdk::api::time(),
//             author: CommentAuthor {
//                 name: "Reader".to_string(),
//                 avatar: "reader.jpg".to_string(),
//             },
//             is_reply: false,
//             parent_id: None,
//         }];

//         let context = NoteTemplateContext::new(article, author, site)
//             .with_comments(comments);

//         assert!(context.comments.is_some());
//         assert_eq!(context.comments.as_ref().unwrap().len(), 1);
//     }
// } 