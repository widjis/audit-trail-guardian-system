
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
   * Execute PowerShell command and return result
   */
  async executePowerShellCommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`Executing PowerShell command: ${command}`);
      
      const ps = spawn('pwsh', ['-Command', command], {
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
        reject(new Error(`Failed to start PowerShell process: ${error.message}`));
      });
    });
  }

  /**
   * Connect to Exchange Online using app-only authentication
   */
  async connectToExchangeOnline(appId, tenantId, certificateThumbprint) {
    try {
      const command = `Connect-ExchangeOnline -AppId "${appId}" -CertificateThumbprint "${certificateThumbprint}" -Organization "${tenantId}" -ShowProgress:$false`;
      
      await this.executePowerShellCommand(command);
      this.isConnected = true;
      console.log('Successfully connected to Exchange Online');
      return { success: true, message: 'Connected to Exchange Online' };
    } catch (error) {
      console.error('Failed to connect to Exchange Online:', error);
      this.isConnected = false;
      throw new Error(`Exchange Online connection failed: ${error.message}`);
    }
  }

  /**
   * Add user to distribution group
   */
  async addUserToDistributionGroup(userEmail, groupEmail) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Exchange Online');
      }

      const command = `Add-DistributionGroupMember -Identity "${groupEmail}" -Member "${userEmail}" -ErrorAction Stop`;
      await this.executePowerShellCommand(command);
      
      console.log(`Successfully added ${userEmail} to ${groupEmail}`);
      return { success: true, message: `User added to distribution group ${groupEmail}` };
    } catch (error) {
      console.error(`Failed to add user to distribution group:`, error);
      
      // Check if user is already a member
      if (error.message.includes('already a member') || error.message.includes('recipient already exists')) {
        return { success: true, message: `User is already a member of ${groupEmail}`, alreadyMember: true };
      }
      
      throw new Error(`Failed to add user to distribution group: ${error.message}`);
    }
  }

  /**
   * Remove user from distribution group
   */
  async removeUserFromDistributionGroup(userEmail, groupEmail) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Exchange Online');
      }

      const command = `Remove-DistributionGroupMember -Identity "${groupEmail}" -Member "${userEmail}" -Confirm:$false -ErrorAction Stop`;
      await this.executePowerShellCommand(command);
      
      console.log(`Successfully removed ${userEmail} from ${groupEmail}`);
      return { success: true, message: `User removed from distribution group ${groupEmail}` };
    } catch (error) {
      console.error(`Failed to remove user from distribution group:`, error);
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
   * Test connection to Exchange Online
   */
  async testConnection(appId, tenantId, certificateThumbprint) {
    try {
      await this.connectToExchangeOnline(appId, tenantId, certificateThumbprint);
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
