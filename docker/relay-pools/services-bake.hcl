variable "TAG" {
  default = "candidate-20260915"
}
group "default" {
  targets = ["central", "premium-runtime", "premium-monitor"]
}
target "common" {
  context = "."
  dockerfile = "Dockerfile.relay-services"
}
target "central" {
  inherits = ["common"]
  target = "central"
  tags = ["galxai-relay-central:${TAG}"]
}
target "premium-runtime" {
  inherits = ["common"]
  target = "premium-runtime"
  tags = ["galxai-relay-premium:${TAG}"]
}
target "premium-monitor" {
  inherits = ["common"]
  target = "premium-monitor"
  tags = ["galxai-monitor-premium:${TAG}"]
}
