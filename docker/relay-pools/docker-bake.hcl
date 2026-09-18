variable "TAG" { default = "staged-20260915" }
group "default" { targets = ["premium"] }
target "base" {
  context = "."
  dockerfile = "Dockerfile.relay-pools"
}
target "premium" {
  inherits = ["base"]
  target = "premium"
  tags = ["galxai-relay-premium:${TAG}"]
}
