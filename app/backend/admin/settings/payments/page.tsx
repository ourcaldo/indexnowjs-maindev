'use client'

import { useEffect, useState } from 'react'
import { 
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Save,
  X
} from 'lucide-react'

interface PaymentGateway {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  is_default: boolean
  configuration: Record<string, any>
  api_credentials: Record<string, any>
  created_at: string
  updated_at: string
}

export default function PaymentGateways() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchPaymentGateways()
  }, [])

  const fetchPaymentGateways = async () => {
    try {
      const response = await fetch('/api/v1/admin/settings/payments', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setGateways(data.gateways || [])
      }
    } catch (error) {
      console.error('Failed to fetch payment gateways:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (gateway: Partial<PaymentGateway>) => {
    try {
      const url = gateway.id 
        ? `/api/v1/admin/settings/payments/${gateway.id}`
        : '/api/v1/admin/settings/payments'
      
      const method = gateway.id ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(gateway),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: `Payment gateway ${gateway.id ? 'updated' : 'created'} successfully!` })
        fetchPaymentGateways()
        setEditingGateway(null)
        setIsCreating(false)
      } else {
        setMessage({ type: 'error', text: 'Failed to save payment gateway' })
      }
    } catch (error) {
      console.error('Failed to save payment gateway:', error)
      setMessage({ type: 'error', text: 'Failed to save payment gateway' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) return

    try {
      const response = await fetch(`/api/v1/admin/settings/payments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment gateway deleted successfully!' })
        fetchPaymentGateways()
      } else {
        setMessage({ type: 'error', text: 'Failed to delete payment gateway' })
      }
    } catch (error) {
      console.error('Failed to delete payment gateway:', error)
      setMessage({ type: 'error', text: 'Failed to delete payment gateway' })
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/admin/settings/payments/${id}/default`, {
        method: 'PATCH',
        credentials: 'include'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Default payment gateway updated!' })
        fetchPaymentGateways()
      } else {
        setMessage({ type: 'error', text: 'Failed to update default gateway' })
      }
    } catch (error) {
      console.error('Failed to update default gateway:', error)
      setMessage({ type: 'error', text: 'Failed to update default gateway' })
    }
  }

  const GatewayForm = ({ gateway, onSave, onCancel }: {
    gateway: Partial<PaymentGateway>
    onSave: (gateway: Partial<PaymentGateway>) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState(gateway)

    const updateField = (field: keyof PaymentGateway, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    }

    const updateConfigurationField = (field: string, value: any) => {
      setFormData(prev => ({
        ...prev,
        configuration: {
          ...prev.configuration,
          [field]: value
        }
      }))
    }

    return (
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="PayPal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug || ''}
              onChange={(e) => updateField('slug', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="paypal"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="PayPal payment gateway integration"
            />
          </div>

          {/* Bank Transfer Configuration */}
          {formData.slug === 'bank_transfer' && (
            <>
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  Bank Transfer Configuration
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bank Name</label>
                <input
                  type="text"
                  value={formData.configuration?.bank_name || ''}
                  onChange={(e) => updateConfigurationField('bank_name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Bank Central Asia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bank Code</label>
                <input
                  type="text"
                  value={formData.configuration?.bank_code || ''}
                  onChange={(e) => updateConfigurationField('bank_code', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="014"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.configuration?.account_name || ''}
                  onChange={(e) => updateConfigurationField('account_name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="PT. IndexNow Studio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.configuration?.account_number || ''}
                  onChange={(e) => updateConfigurationField('account_number', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="1234567890"
                />
              </div>
            </>
          )}

          {/* Midtrans Recurring Configuration */}
          {formData.slug === 'midtrans' && (
            <>
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  Midtrans Recurring API Configuration
                </h3>
                <p className="text-sm text-[#6C757D] mb-4">
                  Configure your Midtrans credentials for recurring subscription payments. Note: Midtrans only accepts IDR currency.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Environment</label>
                <select
                  value={formData.configuration?.environment || 'sandbox'}
                  onChange={(e) => updateConfigurationField('environment', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Merchant ID</label>
                <input
                  type="text"
                  value={formData.api_credentials?.merchant_id || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    api_credentials: {
                      ...prev.api_credentials,
                      merchant_id: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="G123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Client Key</label>
                <input
                  type="text"
                  value={formData.api_credentials?.client_key || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    api_credentials: {
                      ...prev.api_credentials,
                      client_key: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="SB-Mid-client-..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Server Key</label>
                <input
                  type="password"
                  value={formData.api_credentials?.server_key || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    api_credentials: {
                      ...prev.api_credentials,
                      server_key: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="SB-Mid-server-..."
                />
                <p className="text-xs text-[#6C757D] mt-1">
                  Server key will be encrypted before storing in database
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={formData.configuration?.webhook_url || ''}
                  onChange={(e) => updateConfigurationField('webhook_url', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="https://yourdomain.com/api/midtrans/webhook"
                  readOnly
                />
                <p className="text-xs text-[#6C757D] mt-1">
                  This webhook URL should be configured in your Midtrans dashboard
                </p>
              </div>
            </>
          )}

          {/* Midtrans Snap Configuration */}
          {formData.slug === 'midtrans_snap' && (
            <>
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  Midtrans Snap API Configuration
                </h3>
                <p className="text-sm text-[#6C757D] mb-4">
                  Configure your Midtrans Snap credentials for one-time payments with popup interface. Supports credit cards, bank transfers, e-wallets, and more payment methods.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Environment</label>
                <select
                  value={formData.configuration?.environment || 'sandbox'}
                  onChange={(e) => updateConfigurationField('environment', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Merchant ID</label>
                <input
                  type="text"
                  value={formData.api_credentials?.merchant_id || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    api_credentials: {
                      ...prev.api_credentials,
                      merchant_id: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="G123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Client Key</label>
                <input
                  type="text"
                  value={formData.api_credentials?.client_key || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    api_credentials: {
                      ...prev.api_credentials,
                      client_key: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="SB-Mid-client-..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Server Key</label>
                <input
                  type="password"
                  value={formData.api_credentials?.server_key || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    api_credentials: {
                      ...prev.api_credentials,
                      server_key: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="SB-Mid-server-..."
                />
                <p className="text-xs text-[#6C757D] mt-1">
                  Server key will be encrypted before storing in database
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={formData.configuration?.webhook_url || ''}
                  onChange={(e) => updateConfigurationField('webhook_url', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="https://yourdomain.com/api/midtrans/webhook"
                  readOnly
                />
                <p className="text-xs text-[#6C757D] mt-1">
                  This webhook URL should be configured in your Midtrans dashboard for payment notifications
                </p>
              </div>
            </>
          )}

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active || false}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="rounded border-border text-[#3D8BFF] focus:ring-accent"
              />
              <span className="ml-2 text-sm text-foreground">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_default || false}
                onChange={(e) => updateField('is_default', e.target.checked)}
                className="rounded border-border text-[#3D8BFF] focus:border-transparent"
              />
              <span className="ml-2 text-sm text-foreground">Default</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[#6C757D] hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Gateways</h1>
          <p className="text-[#6C757D] mt-1">Manage payment methods and processing options</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Gateway</span>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20' 
            : 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <GatewayForm
          gateway={{}}
          onSave={handleSave}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Payment Gateways List */}
      <div className="space-y-4">
        {gateways.map((gateway) => (
          <div key={gateway.id}>
            {editingGateway?.id === gateway.id ? (
              <GatewayForm
                gateway={editingGateway}
                onSave={handleSave}
                onCancel={() => setEditingGateway(null)}
              />
            ) : (
              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#3D8BFF]/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-[#3D8BFF]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-foreground">{gateway.name}</h3>
                        {gateway.is_default && (
                          <span className="px-2 py-1 text-xs font-medium bg-[#4BB543]/10 text-[#4BB543] rounded-full border border-[#4BB543]/20">
                            Default
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                          gateway.is_active 
                            ? 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20'
                            : 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                        }`}>
                          {gateway.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-[#6C757D] mt-1">{gateway.description}</p>
                      <p className="text-xs text-[#6C757D] mt-1">Slug: {gateway.slug}</p>
                      {gateway.slug === 'bank_transfer' && gateway.configuration && (
                        <div className="mt-2 text-xs text-[#6C757D] space-y-1">
                          {gateway.configuration.bank_name && (
                            <p><strong>Bank:</strong> {gateway.configuration.bank_name}</p>
                          )}
                          {gateway.configuration.account_name && (
                            <p><strong>Account:</strong> {gateway.configuration.account_name}</p>
                          )}
                          {gateway.configuration.account_number && (
                            <p><strong>Number:</strong> {gateway.configuration.account_number}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!gateway.is_default && (
                      <button
                        onClick={() => handleSetDefault(gateway.id)}
                        className="px-3 py-1 text-sm text-[#3D8BFF] hover:bg-[#3D8BFF]/10 rounded-lg transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => setEditingGateway(gateway)}
                      className="p-2 text-[#6C757D] hover:text-foreground hover:bg-[#F7F9FC] rounded-lg transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(gateway.id)}
                      className="p-2 text-[#6C757D] hover:text-[#E63946] hover:bg-[#E63946]/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {gateways.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
          <p className="text-[#6C757D]">No payment gateways configured</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 text-[#3D8BFF] hover:underline"
          >
            Add your first payment gateway
          </button>
        </div>
      )}
    </div>
  )
}