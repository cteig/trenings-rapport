variable "hostname" {
  description = "Hostname for the application server."
  type        = string
  default     = "trenings-rapport-prod"
}

variable "zone" {
  description = "UpCloud zone to deploy the server into."
  type        = string
  default     = "nl-ams1"
}

variable "plan" {
  description = "UpCloud server plan. 1xCPU-2GB is a good starting point for this app."
  type        = string
  default     = "1xCPU-2GB"
}

variable "template" {
  description = "UpCloud public storage template for the server OS."
  type        = string
  default     = "Ubuntu Server 24.04 LTS (Noble Numbat)"
}

variable "storage_size" {
  description = "Root disk size in GB."
  type        = number
  default     = 25
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key allowed to log in to the server."
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to connect over SSH. Change this from the default before apply."
  type        = string
  default     = "0.0.0.0/0"
}

variable "enable_daily_backups" {
  description = "Enable UpCloud daily server backups."
  type        = bool
  default     = true
}

variable "backup_time" {
  description = "Backup time in HHMM UTC format."
  type        = string
  default     = "0100"
}

variable "backup_retention" {
  description = "Number of daily backups to retain."
  type        = number
  default     = 8
}

variable "labels" {
  description = "Extra labels to add to the server."
  type        = map(string)
  default = {
    app = "trenings-rapport"
    env = "prod"
  }
}
