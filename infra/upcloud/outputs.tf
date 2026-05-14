output "server_id" {
  description = "UpCloud server ID."
  value       = upcloud_server.app.id
}

output "hostname" {
  description = "Server hostname."
  value       = upcloud_server.app.hostname
}

output "public_ip_address" {
  description = "Public IPv4 address for the application server."
  value       = upcloud_server.app.network_interface[0].ip_address
}

output "utility_network_mac" {
  description = "Utility network MAC address, useful for future floating IP or private networking work."
  value       = upcloud_server.app.network_interface[1].mac_address
}
