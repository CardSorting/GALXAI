variable "TAG" { default = "staged-20260915" }
group "default" { targets = ["premium", "standard"] }
target "base" {
  context = "."
  dockerfile = "Dockerfile.relay-pools"
}
target "premium" {
  inherits = ["base"]
  target = "premium"
  tags = ["galxai-relay-premium:${TAG}"]
}
target "standard" {
  inherits = ["base"]
  target = "standard"
  tags = ["galxai-relay-standard:${TAG}"]
}
