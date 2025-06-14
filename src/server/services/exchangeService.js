import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExchangeService {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Check if PowerShell is available
   */
  async checkPowerShellAvailability() {
    return new Promise((resolve) => {
      // Try pwsh first (PowerShell Core)
      const ps = spawn('pwsh', ['--version'], { stdio: 'pipe' });
      
      ps.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true, command: 'pwsh', type: 'PowerShell Core' });
        } else {
          // Try powershell (Windows PowerShell)
          const ps2 = spawn('powershell', ['$PSVersionTable.PSVersion'], { stdio: 'pipe' });
          
          ps2.on('close', (code2) => {
            if (code2 === 0) {
              resolve({ available: true, command: 'powershell', type: 'Windows PowerShell' });
            } else {
              resolve({ available: false, command: null, type: null });
            }
          });
          
          ps2.on('error', () => {
            resolve({ available: false, command: null, type: null });
          });
        }
      });
      
      ps.on('error', () => {
        // Try powershell (Windows PowerShell)
        const ps2 = spawn('powershell', ['$PSVersionTable.PSVersion'], { stdio: 'pipe' });
        
        ps2.on('close', (code2) => {
          if (code2 === 0) {
            resolve({ available: true, command: 'powershell', type: 'Windows PowerShell' });
          } else {
            resolve({ available: false, command: null, type: null });
          }
        });
        
        ps2.on('error', () => {
          resolve({ available: false, command: null, type: null });
        });
      });
    });
  }

  /**
   * Execute PowerShell command and return result
   */
  async executePowerShellCommand(command) {
    // Check PowerShell availability first
    const psInfo = await this.checkPowerShellAvailability();
    
    if (!psInfo.available) {
      throw new Error('PowerShell is not installed or not available in the system PATH. Please install PowerShell Core (pwsh) or ensure Windows PowerShell is available.');
    }

    return new Promise((resolve, reject) => {
      console.log(`Executing PowerShell command using ${psInfo.type}: ${command}`);
      
      const ps = spawn(psInfo.command, ['-Command', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      ps.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ps.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ps.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`PowerShell command failed with code ${code}: ${stderr}`));
        }
      });

      ps.on('error', (error) => {
        reject(new Error(`Failed to start PowerShell process: ${error.message}. Please ensure PowerShell is installed and available in the system PATH.`));
      });
    });
  }

  /**
   * Create secure password file
   */
  async createSecurePassword(password) {
    try {
      console.log('Creating secure password file...');
      
      if (!password) {
        throw new Error('Password is required');
      }

      // Check PowerShell availability first
      const psInfo = await this.checkPowerShellAvailability();
      
      if (!psInfo.available) {
        throw new Error('PowerShell is not installed or not available. Please install PowerShell Core (pwsh) or ensure Windows PowerShell is available in the system PATH.');
      }

      const passwordPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'exo_password.sec');
      console.log('Password file path:', passwordPath);
      console.log('Using PowerShell:', psInfo.type);
      
      const command = `
        $secureString = ConvertTo-SecureString "${password.replace(/"/g, '""')}" -AsPlainText -Force
        $encryptedPassword = ConvertFrom-SecureString $secureString
        Set-Content -Path "${passwordPath}" -Value $encryptedPassword
        Write-Output "Password saved securely to ${passwordPath}"
      `;
      
      const result = await this.executePowerShellCommand(command);
      console.log('PowerShell result:', result);
      
      return { success: true, message: 'Password saved securely' };
    } catch (error) {
      console.error('Failed to create secure password:', error);
      throw new Error(`Failed to create secure password: ${error.message}`);
    }
  }

  /**
   * Connect to Exchange Online using basic authentication with SecureString
   */
  async connectToExchangeOnline(username) {
    try {
      const command = `
        # Load .env manually from server directory
        $envPath = "${path.join(__dirname, '../.env')}"
        if (Test-Path $envPath) {
          Get-Content $envPath | ForEach-Object {
            if ($_ -match '^\\s*#') { return }
            $parts = $_ -split '=', 2
            if ($parts.Length -eq 2) {
              [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
            }
          }
        }

        # Read username and password
        $user = if ("${username}") { "${username}" } else { $env:EXO_USER }
        $passwordPath = "${path.join(process.env.HOME || process.env.USERPROFILE || '.', 'exo_password.sec')}"
        
        if (-not (Test-Path $passwordPath)) {
          throw "Password file not found at $passwordPath. Please run setup first."
        }
        
        $securePassword = Get-Content $passwordPath | ConvertTo-SecureString
        $cred = New-Object System.Management.Automation.PSCredential ($user, $securePassword)
        
        # Connect to Exchange Online
        Connect-ExchangeOnline -Credential $cred -ShowProgress:$false -ErrorAction Stop
        Write-Output "Connected successfully to Exchange Online"
      `;
      
      await this.executePowerShellCommand(command);
      this.isConnected = true;
      console.log('Successfully connected to Exchange Online with basic authentication');
      return { success: true, message: 'Connected to Exchange Online' };
    } catch (error) {
      console.error('Failed to connect to Exchange Online:', error);
      this.isConnected = false;
      throw new Error(`Exchange Online connection failed: ${error.message}`);
    }
  }

  /**
   * Test password file exists and is valid
   */
  async validatePasswordFile() {
    try {
      const passwordPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'exo_password.sec');
      const command = `
        $passwordPath = "${passwordPath}"
        if (Test-Path $passwordPath) {
          $securePassword = Get-Content $passwordPath | ConvertTo-SecureString -ErrorAction Stop
          Write-Output "Password file is valid"
        } else {
          throw "Password file not found"
        }
      `;
      
      await this.executePowerShellCommand(command);
      return { success: true, message: 'Password file is valid' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Add user to distribution group or Office 365 group
   */
  async addUserToDistributionGroup(userEmail, groupEmail) {
    try {
      const username = process.env.EXO_USER;
      const passwordPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'exo_password.sec');

      // Script: try Get-DistributionGroup first; fallback to Office 365 Group logic if not found or not supported
      const command = `
        Import-Module ExchangeOnlineManagement -ErrorAction Stop

        $user = "${username}"
        $passwordPath = "${passwordPath}"
        if (-not (Test-Path $passwordPath)) {
          throw "Password file not found at $passwordPath. Please run setup first."
        }
        $securePassword = Get-Content $passwordPath | ConvertTo-SecureString
        $cred = New-Object System.Management.Automation.PSCredential ($user, $securePassword)
        Connect-ExchangeOnline -Credential $cred -ShowProgress:$false -ErrorAction Stop

        $group = Get-DistributionGroup -Identity "${groupEmail}" -ErrorAction SilentlyContinue
        if ($group) {
          try {
            Add-DistributionGroupMember -Identity "${groupEmail}" -Member "${userEmail}" -ErrorAction Stop
            $resultMsg = "User added to classic Distribution Group"
          } catch {
            if ($_.Exception.Message -match "already a member" -or $_.Exception.Message -match "recipient already exists") {
              $resultMsg = "ALREADY_MEMBER"
            } else {
              throw $_
            }
          }
        } else {
          # Not a classic DG, try as Office 365 Group (Unified/GroupMailbox)
          $unifiedGroup = Get-UnifiedGroup -Identity "${groupEmail}" -ErrorAction SilentlyContinue
          if ($unifiedGroup) {
            try {
              Add-UnifiedGroupLinks -Identity "${groupEmail}" -Links "${userEmail}" -LinkType Members -ErrorAction Stop
              $resultMsg = "User added to Office 365 group"
            } catch {
              if ($_.Exception.Message -match "already a member" -or $_.Exception.Message -match "is already present in the specified links") {
                $resultMsg = "ALREADY_MEMBER"
              } elseif ($_.Exception.Message -match "The current operation is not supported on GroupMailbox") {
                throw "Can't add to GroupMailbox with Add-DistributionGroupMember, must use Add-UnifiedGroupLinks"
              } else {
                throw $_
              }
            }
          } else {
            throw "Group ${groupEmail} was not found as DistributionGroup or UnifiedGroup."
          }
        }
        Disconnect-ExchangeOnline -Confirm:$false

        if ($resultMsg -eq "ALREADY_MEMBER") {
          Write-Output "ALREADY_MEMBER"
        } else {
          Write-Output $resultMsg
        }
      `;

      const result = await this.executePowerShellCommand(command);
      if (result.includes("ALREADY_MEMBER")) {
        return { success: true, message: `User is already a member of ${groupEmail}`, alreadyMember: true };
      }
      return { success: true, message: `User added to distribution group ${groupEmail}` };
    } catch (error) {
      // Expand error reporting for mailbox type
      if (
        error.message.includes('The current operation is not supported on GroupMailbox') ||
        error.message.match(/Add-DistributionGroupMember.*not recognized/) // fallback
      ) {
        return { success: false, message: `This is an Office 365 Group (GroupMailbox), not a classic distribution group. Please ensure the group type is compatible.`, o365Group: true };
      }
      if (error.message.includes('already a member') || error.message.includes('recipient already exists') || error.message.includes("is already present in the specified links")) {
        return { success: true, message: `User is already a member of ${groupEmail}`, alreadyMember: true };
      }
      throw new Error(`Failed to add user to distribution group: ${error.message}`);
    }
  }

  /**
   * Remove user from distribution group or Office 365 group
   */
  async removeUserFromDistributionGroup(userEmail, groupEmail) {
    try {
      const username = process.env.EXO_USER;
      const passwordPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'exo_password.sec');
      const command = `
        Import-Module ExchangeOnlineManagement -ErrorAction Stop

        $user = "${username}"
        $passwordPath = "${passwordPath}"
        if (-not (Test-Path $passwordPath)) {
          throw "Password file not found at $passwordPath. Please run setup first."
        }
        $securePassword = Get-Content $passwordPath | ConvertTo-SecureString
        $cred = New-Object System.Management.Automation.PSCredential ($user, $securePassword)
        Connect-ExchangeOnline -Credential $cred -ShowProgress:$false -ErrorAction Stop

        $group = Get-DistributionGroup -Identity "${groupEmail}" -ErrorAction SilentlyContinue
        if ($group) {
          Remove-DistributionGroupMember -Identity "${groupEmail}" -Member "${userEmail}" -Confirm:\$false -ErrorAction Stop
          $resultMsg = "User removed from classic Distribution Group"
        } else {
          $unifiedGroup = Get-UnifiedGroup -Identity "${groupEmail}" -ErrorAction SilentlyContinue
          if ($unifiedGroup) {
            Remove-UnifiedGroupLinks -Identity "${groupEmail}" -Links "${userEmail}" -LinkType Members -Confirm:\$false -ErrorAction Stop
            $resultMsg = "User removed from Office 365 group"
          } else {
            throw "Group ${groupEmail} was not found as DistributionGroup or UnifiedGroup."
          }
        }
        Disconnect-ExchangeOnline -Confirm:$false
        Write-Output $resultMsg
      `;
      const result = await this.executePowerShellCommand(command);
      return { success: true, message: `User removed from distribution group ${groupEmail}` };
    } catch (error) {
      if (error.message.includes('is not a member') || error.message.includes('is not present in the specified links')) {
        return { success: true, message: `User was not a member of ${groupEmail}` };
      }
      throw new Error(`Failed to remove user from distribution group: ${error.message}`);
    }
  }

  /**
   * Get user's current distribution group memberships
   */
  async getUserDistributionGroups(userEmail) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Exchange Online');
      }

      const command = `Get-DistributionGroup | Where-Object { (Get-DistributionGroupMember -Identity $_.Identity | Where-Object { $_.PrimarySmtpAddress -eq "${userEmail}" }) } | Select-Object Name, PrimarySmtpAddress | ConvertTo-Json`;
      const result = await this.executePowerShellCommand(command);
      
      if (!result || result.trim() === '') {
        return [];
      }

      try {
        const groups = JSON.parse(result);
        return Array.isArray(groups) ? groups : [groups];
      } catch (parseError) {
        console.error('Failed to parse distribution groups JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error(`Failed to get user distribution groups:`, error);
      throw new Error(`Failed to get user distribution groups: ${error.message}`);
    }
  }

  /**
   * Get all available distribution groups
   */
  async getAllDistributionGroups() {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Exchange Online');
      }

      const command = `Get-DistributionGroup | Select-Object Name, PrimarySmtpAddress, DisplayName | ConvertTo-Json`;
      const result = await this.executePowerShellCommand(command);
      
      if (!result || result.trim() === '') {
        return [];
      }

      try {
        const groups = JSON.parse(result);
        return Array.isArray(groups) ? groups : [groups];
      } catch (parseError) {
        console.error('Failed to parse distribution groups JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error(`Failed to get distribution groups:`, error);
      throw new Error(`Failed to get distribution groups: ${error.message}`);
    }
  }

  /**
   * Disconnect from Exchange Online
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await this.executePowerShellCommand('Disconnect-ExchangeOnline -Confirm:$false');
        this.isConnected = false;
        console.log('Disconnected from Exchange Online');
      }
    } catch (error) {
      console.error('Error disconnecting from Exchange Online:', error);
      this.isConnected = false;
    }
  }

  /**
   * Test connection to Exchange Online with basic auth
   */
  async testConnection(username, password) {
    try {
      // First create the secure password file temporarily for testing
      await this.createSecurePassword(password);
      
      // Test the connection
      await this.connectToExchangeOnline(username);
      await this.disconnect();
      return { success: true, message: 'Exchange Online connection test successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Create singleton instance
const exchangeService = new ExchangeService();

export default exchangeService;
