/**
 * Multi-Language SDK Integration Datasets for pSEO and AEO
 */

export interface SdkLangGuide {
  slug: string;
  language: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  packageManager: string;
  installCommand: string;
  codeSnippet: string;
  streamingSnippet: string;
  faqs: { q: string; a: string }[];
}

export const SDK_LANG_GUIDES: SdkLangGuide[] = [
  {
    slug: 'go',
    language: 'Go / Golang',
    badge: 'Golang Drop-in',
    title: 'Go / Golang AI Gateway Integration — sashabaranov/go-openai Setup',
    headline: 'Connect Go / Golang to GALXAI Universal Gateway',
    description:
      'Integrate the popular sashabaranov/go-openai library with GALXAI for high-concurrency Go microservices with 25%–40% wholesale savings and 75% prompt caching.',
    packageManager: 'go get',
    installCommand: 'go get github.com/sashabaranov/go-openai',
    codeSnippet: `package main

import (
	"context"
	"fmt"
	"github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("galx_live_your_gateway_key")
	config.BaseURL = "https://api.galx.ai/v1"

	client := openai.NewClientWithConfig(config)
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "gpt-5.6-sol",
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleUser, Content: "Hello from high-concurrency Golang worker!"},
			},
		},
	)
	if err != nil {
		panic(err)
	}
	fmt.Println(resp.Choices[0].Message.Content)
}`,
    streamingSnippet: `// Server-Sent Events (SSE) Streaming in Go
stream, err := client.CreateChatCompletionStream(
	context.Background(),
	openai.ChatCompletionRequest{
		Model: "gpt-5.6-luna",
		Stream: true,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: "Stream in <14ms TTFT"},
		},
	},
)`,
    faqs: [
      {
        q: 'Does sashabaranov/go-openai support custom BaseURL?',
        a: 'Yes, setting config.BaseURL = "https://api.galx.ai/v1" allows 100% transparent routing with zero SDK modifications.',
      },
    ],
  },
  {
    slug: 'rust',
    language: 'Rust',
    badge: 'Async-OpenAI Crate',
    title: 'Rust AI Gateway Integration — async-openai Crate Quickstart',
    headline: 'Connect Rust to GALXAI Universal Gateway with async-openai',
    description:
      'Build memory-safe, ultra-low latency AI pipelines in Rust using the async-openai crate routed through GALXAI Anycast edge nodes.',
    packageManager: 'cargo add',
    installCommand: 'cargo add async-openai tokio',
    codeSnippet: `use async_openai::{
    config::OpenAIConfig,
    types::{ChatCompletionRequestSystemMessageArgs, CreateChatCompletionRequestArgs},
    Client,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = OpenAIConfig::new()
        .with_api_base("https://api.galx.ai/v1")
        .with_api_key("galx_live_your_gateway_key");

    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-5.6-sol")
        .messages([ChatCompletionRequestSystemMessageArgs::default()
            .content("You are a Rust systems engineer.")
            .build()?
            .into()])
        .build()?;

    let response = client.chat().create(request).await?;
    println!("{}", response.choices[0].message.content.as_ref().unwrap());
    Ok(())
}`,
    streamingSnippet: `// Async Token Streaming in Rust
let mut stream = client.chat().create_stream(request).await?;
while let Some(result) = stream.next().await {
    // Process delta chunks
}`,
    faqs: [
      {
        q: 'Is async-openai compatible with GALXAI Anycast proxies?',
        a: 'Yes, async-openai supports with_api_base("https://api.galx.ai/v1") with complete request and SSE streaming parity.',
      },
    ],
  },
  {
    slug: 'curl',
    language: 'cURL & Raw HTTP/2',
    badge: 'Raw REST / SSE Protocol',
    title: 'cURL & Raw HTTP/2 AI Gateway Reference — Direct REST & SSE Streaming',
    headline: 'cURL & Raw HTTP/2 AI Gateway API Reference',
    description:
      'Execute direct HTTP/2 POST requests and consume Server-Sent Events (SSE) streams in bash, CI/CD pipelines, or custom runtime environments.',
    packageManager: 'curl',
    installCommand: '# Pre-installed on all Unix & macOS environments',
    codeSnippet: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [
      {"role": "user", "content": "Execute high-throughput cURL completion"}
    ]
  }'`,
    streamingSnippet: `# Stream Server-Sent Events (SSE) in terminal
curl -N https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-luna",
    "stream": true,
    "messages": [{"role": "user", "content": "Stream response in real time"}]
  }'`,
    faqs: [
      {
        q: 'What headers are required for GALXAI HTTP requests?',
        a: 'Only "Authorization: Bearer galx_live_..." and "Content-Type: application/json". No custom headers required.',
      },
    ],
  },
  {
    slug: 'ruby',
    language: 'Ruby',
    badge: 'ruby-openai Gem',
    title: 'Ruby AI Gateway Integration — ruby-openai Gem Quickstart',
    headline: 'Connect Ruby on Rails to GALXAI with ruby-openai',
    description:
      'Power Ruby on Rails applications with wholesale LLM tokens and 75% prompt caching using the official ruby-openai gem.',
    packageManager: 'gem install',
    installCommand: 'bundle add ruby-openai',
    codeSnippet: `require "openai"

client = OpenAI::Client.new(
  access_token: "galx_live_your_gateway_key",
  uri_base: "https://api.galx.ai"
)

response = client.chat(
  parameters: {
    model: "gpt-5.6-sol",
    messages: [{ role: "user", content: "Hello from Ruby on Rails!" }]
  }
)
puts response.dig("choices", 0, "message", "content")`,
    streamingSnippet: `# Streaming in Ruby
client.chat(
  parameters: {
    model: "gpt-5.6-luna",
    messages: [{ role: "user", content: "Stream output" }],
    stream: proc { |chunk, _bytesize| print chunk.dig("choices", 0, "delta", "content") }
  }
)`,
    faqs: [
      {
        q: 'How do I configure the Base URL in ruby-openai?',
        a: 'Set uri_base: "https://api.galx.ai" when instantiating OpenAI::Client.',
      },
    ],
  },
  {
    slug: 'php',
    language: 'PHP / Laravel',
    badge: 'openai-php/client Drop-in',
    title: 'PHP & Laravel AI Gateway Integration — openai-php/client Quickstart',
    headline: 'Connect PHP & Laravel to GALXAI with openai-php/client',
    description:
      'Seamlessly route Laravel and Symfony AI workloads through GALXAI with wholesale pricing and sub-15ms Anycast latency.',
    packageManager: 'composer require',
    installCommand: 'composer require openai-php/client',
    codeSnippet: `<?php
require 'vendor/autoload.php';

$client = OpenAI::factory()
    ->withBaseUri('https://api.galx.ai/v1')
    ->withApiKey('galx_live_your_gateway_key')
    ->make();

$result = $client->chat()->create([
    'model' => 'gpt-5.6-sol',
    'messages' => [
        ['role' => 'user', 'content' => 'Hello from PHP & Laravel!'],
    ],
]);

echo $result->choices[0]->message->content;`,
    streamingSnippet: `// Server-Sent Events Streaming in PHP
$stream = $client->chat()->createStreamed([
    'model' => 'gpt-5.6-luna',
    'messages' => [['role' => 'user', 'content' => 'Stream tokens']],
]);

foreach ($stream as $response) {
    echo $response->choices[0]->delta->content;
}`,
    faqs: [
      {
        q: 'How do I set the custom Base URL in openai-php/client?',
        a: 'Use ->withBaseUri("https://api.galx.ai/v1") during client factory initialization.',
      },
    ],
  },
];
