locals {
  ssh_cidr_parts = split("/", var.ssh_allowed_cidr)
  ssh_start_ip   = local.ssh_cidr_parts[0]
  ssh_end_ip     = cidrhost(var.ssh_allowed_cidr, -1)
}

resource "upcloud_server" "app" {
  hostname = var.hostname
  zone     = var.zone
  plan     = var.plan
  firewall = true
  metadata = true

  template {
    storage = var.template
    size    = var.storage_size

    dynamic "backup_rule" {
      for_each = var.enable_daily_backups ? [1] : []

      content {
        interval  = "daily"
        time      = var.backup_time
        retention = var.backup_retention
      }
    }
  }

  network_interface {
    type = "public"
  }

  network_interface {
    type = "utility"
  }

  login {
    user            = "root"
    keys            = [trimspace(file(var.ssh_public_key_path))]
    create_password = false
  }

  labels = var.labels
}

resource "upcloud_firewall_rules" "app" {
  server_id = upcloud_server.app.id

  firewall_rule {
    action                 = "accept"
    comment                = "Allow SSH"
    direction              = "in"
    family                 = "IPv4"
    protocol               = "tcp"
    source_address_start   = local.ssh_start_ip
    source_address_end     = local.ssh_end_ip
    destination_port_start = "22"
    destination_port_end   = "22"
  }

  firewall_rule {
    action                 = "accept"
    comment                = "Allow HTTP"
    direction              = "in"
    family                 = "IPv4"
    protocol               = "tcp"
    destination_port_start = "80"
    destination_port_end   = "80"
  }

  firewall_rule {
    action                 = "accept"
    comment                = "Allow HTTPS"
    direction              = "in"
    family                 = "IPv4"
    protocol               = "tcp"
    destination_port_start = "443"
    destination_port_end   = "443"
  }

  firewall_rule {
    action    = "drop"
    comment   = "Drop other inbound IPv4 traffic"
    direction = "in"
    family    = "IPv4"
  }
}
