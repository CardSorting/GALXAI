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
      'Integrate the popular sashabaranov/go-openai library with GALXAI for high-concurrency Go microservices with sustainable pricing and 75% prompt caching.',
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
	config.BaseURL = "https://galx.ai/v1"

	client := openai.NewClientWithConfig(config)
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "galx-nova",
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
		Model: "galx-nova",
		Stream: true,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: "Stream in <14ms TTFT"},
		},
	},
)`,
    faqs: [
      {
        q: 'Does sashabaranov/go-openai support custom BaseURL?',
        a: 'Yes, setting config.BaseURL = "https://galx.ai/v1" allows 100% transparent routing with zero SDK modifications.',
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
      'Build memory-safe, ultra-low latency AI pipelines in Rust using the async-openai crate routed through GALXAI distributed edge nodes.',
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
        .with_api_base("https://galx.ai/v1")
        .with_api_key("galx_live_your_gateway_key");

    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("galx-nova")
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
        q: 'Is async-openai compatible with GALXAI distributed edge proxies?',
        a: 'Yes, async-openai supports with_api_base("https://galx.ai/v1") with complete request and SSE streaming parity.',
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
    codeSnippet: `curl https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "galx-nova",
    "messages": [
      {"role": "user", "content": "Execute high-throughput cURL completion"}
    ]
  }'`,
    streamingSnippet: `# Stream Server-Sent Events (SSE) in terminal
curl -N https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "galx-nova",
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
      'Power Ruby on Rails applications with sustainable LLM tokens and 75% prompt caching using the official ruby-openai gem.',
    packageManager: 'gem install',
    installCommand: 'bundle add ruby-openai',
    codeSnippet: `require "openai"

client = OpenAI::Client.new(
  access_token: "galx_live_your_gateway_key",
  uri_base: "https://galx.ai"
)

response = client.chat(
  parameters: {
    model: "galx-nova",
    messages: [{ role: "user", content: "Hello from Ruby on Rails!" }]
  }
)
puts response.dig("choices", 0, "message", "content")`,
    streamingSnippet: `# Streaming in Ruby
client.chat(
  parameters: {
    model: "galx-nova",
    messages: [{ role: "user", content: "Stream output" }],
    stream: proc { |chunk, _bytesize| print chunk.dig("choices", 0, "delta", "content") }
  }
)`,
    faqs: [
      {
        q: 'How do I configure the Base URL in ruby-openai?',
        a: 'Set uri_base: "https://galx.ai" when instantiating OpenAI::Client.',
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
      'Seamlessly route Laravel and Symfony AI workloads through GALXAI with sustainable pricing and sub-15ms edge latency.',
    packageManager: 'composer require',
    installCommand: 'composer require openai-php/client',
    codeSnippet: `<?php
require 'vendor/autoload.php';

$client = OpenAI::factory()
    ->withBaseUri('https://galx.ai/v1')
    ->withApiKey('galx_live_your_gateway_key')
    ->make();

$result = $client->chat()->create([
    'model' => 'galx-nova',
    'messages' => [
        ['role' => 'user', 'content' => 'Hello from PHP & Laravel!'],
    ],
]);

echo $result->choices[0]->message->content;`,
    streamingSnippet: `// Server-Sent Events Streaming in PHP
$stream = $client->chat()->createStreamed([
    'model' => 'galx-nova',
    'messages' => [['role' => 'user', 'content' => 'Stream tokens']],
]);

foreach ($stream as $response) {
    echo $response->choices[0]->delta->content;
}`,
    faqs: [
      {
        q: 'How do I set the custom Base URL in openai-php/client?',
        a: 'Use ->withBaseUri("https://galx.ai/v1") during client factory initialization.',
      },
    ],
  },
  {
    slug: 'csharp',
    language: 'C# / .NET',
    badge: 'Official Azure.AI.OpenAI / OpenAI .NET',
    title: 'C# .NET AI Gateway Integration — Official OpenAI .NET Client Quickstart',
    headline: 'Connect C# & .NET Applications to GALXAI Universal Gateway',
    description:
      'Integrate the official OpenAI NuGet package in ASP.NET Core, MAUI, and enterprise microservices with sustainable developer pricing and 75% prompt caching.',
    packageManager: 'dotnet add package',
    installCommand: 'dotnet add package OpenAI --prerelease',
    codeSnippet: `using OpenAI;
using OpenAI.Chat;

// Initialize OpenAI Client pointing to GALXAI Universal Gateway
var clientOptions = new OpenAIClientOptions {
    Endpoint = new Uri("https://galx.ai/v1")
};
var client = new ChatClient("galx-nova", "galx_live_your_gateway_key", clientOptions);

ChatCompletion completion = await client.CompleteChatAsync("Hello from ASP.NET Core microservice!");
Console.WriteLine(completion.Content[0].Text);`,
    streamingSnippet: `// Asynchronous SSE Streaming in C# .NET
await foreach (StreamingChatCompletionUpdate update in client.CompleteChatStreamingAsync("Stream response"))
{
    foreach (ChatMessageContentPart part in update.ContentUpdate)
    {
        Console.Write(part.Text);
    }
}`,
    faqs: [
      {
        q: 'How do I configure the custom endpoint in the official C# OpenAI library?',
        a: 'Set Endpoint = new Uri("https://galx.ai/v1") inside OpenAIClientOptions when instantiating the client.',
      },
    ],
  },
  {
    slug: 'java',
    language: 'Java / Spring Boot',
    badge: 'LangChain4j & OpenAI Java Drop-in',
    title: 'Java & Spring Boot AI Gateway Integration — LangChain4j Quickstart',
    headline: 'Connect Java & Spring Boot Enterprise Services to GALXAI',
    description:
      'Power Java, Kotlin, and Spring AI backends with GALX Nova managed routing and rate limit protection.',
    packageManager: 'Maven / Gradle',
    installCommand: 'implementation "dev.langchain4j:langchain4j-open-ai:0.35.0"',
    codeSnippet: `import dev.langchain4j.model.openai.OpenAiChatModel;

public class GalxAiQuickstart {
    public static void main(String[] args) {
        OpenAiChatModel model = OpenAiChatModel.builder()
            .baseUrl("https://galx.ai/v1")
            .apiKey("galx_live_your_gateway_key")
            .modelName("galx-nova")
            .build();

        String response = model.generate("Hello from Spring Boot enterprise cluster!");
        System.out.println(response);
    }
}`,
    streamingSnippet: `// LangChain4j Streaming in Java
OpenAiStreamingChatModel streamingModel = OpenAiStreamingChatModel.builder()
    .baseUrl("https://galx.ai/v1")
    .apiKey("galx_live_your_gateway_key")
    .modelName("galx-nova")
    .build();`,
    faqs: [
      {
        q: 'Can I use Spring AI with GALXAI?',
        a: 'Yes. Set spring.ai.openai.base-url=https://galx.ai/v1 and supply your GALXAI live key in application.properties.',
      },
    ],
  },
  {
    slug: 'elixir',
    language: 'Elixir / Phoenix',
    badge: 'High-Concurrency BEAM',
    title: 'Elixir & Phoenix AI Gateway Integration — openai.ex Setup',
    headline: 'Connect Elixir & Phoenix LiveView to GALXAI Distributed Gateway',
    description:
      'Leverage the BEAM virtual machine for millions of concurrent streaming AI sessions with sub-12ms TTFT on GALX Nova.',
    packageManager: 'mix deps.get',
    installCommand: '{:openai, "~> 0.6.2"}',
    codeSnippet: `defmodule GalxAiDemo do
  def complete do
    OpenAI.chat_completion(
      [
        model: "galx-nova",
        messages: [%{role: "user", content: "Hello from Elixir Phoenix LiveView!"}]
      ],
      %{
        api_key: "galx_live_your_gateway_key",
        api_url: "https://galx.ai/v1"
      }
    )
  end
end`,
    streamingSnippet: `// Server-Sent Events Streaming in Phoenix LiveView
OpenAI.chat_completion_stream(
  [model: "galx-nova", messages: [%{role: "user", content: "Stream"}]],
  &send(self(), {:chunk, &1})
)`,
    faqs: [
      {
        q: 'Is GALXAI compatible with Elixir OpenAI wrappers?',
        a: 'Yes. Simply override api_url to "https://galx.ai/v1" in config/config.exs.',
      },
    ],
  },
];
