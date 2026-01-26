import { useState, useEffect } from 'react'
import { Users as UsersIcon, Building2, Search, Edit, Trash2, Plus, AlertCircle, CheckCircle, Loader, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Mail, Phone, Tag, Info } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Agents() {
  const { t, language } = useLanguage()
  const [agents, setAgents] = useState([])
  const [filteredAgents, setFilteredAgents] = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const itemsPerPage = 10
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, agent: null })
  const [updateModal, setUpdateModal] = useState({ isOpen: false, agent: null })
  const [addModal, setAddModal] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    agent_name: '',
    agent_id: '',
    inspector: '',
    department: '',
    company_id: [],
    category: '',
    phone: '',
    email: '',
    is_active: 'active',
    insurance_type: '',
    insurance: false,
    elementary: false,
    ayalon_agent_id: '',
    harel_agent_id: '',
    migdal_agent_id: '',
    menorah_agent_id: '',
    phoenix_agent_id: '',
    clal_agent_id: '',
    altshuler_agent_id: '',
    hachshara_agent_id: '',
    mor_agent_id: '',
    mediho_agent_id: '',
    analyst_agent_id: '',
    commission_id_ayalon: '',
    commission_id_phoenix: '',
    commission_id_harel: '',
    commission_id_clal: '',
    commission_id_migdal: '',
    commission_id_menorah: '',
    commission_id_passportcard: '',
    commission_id_altshuler: '',
    commission_id_excellence: '',
    commission_id_hachshara: '',
    commission_id_mediho: '',
    commission_id_mor: '',
    commission_id_analyst: '',
    elementary_id_ayalon: '',
    elementary_id_hachshara: '',
    elementary_id_harel: '',
    elementary_id_clal: '',
    elementary_id_migdal: '',
    elementary_id_menorah: '',
    elementary_id_phoenix: '',
    elementary_id_shomera: '',
    elementary_id_shlomo: '',
    elementary_id_shirbit: '',
    elementary_id_haklai: '',
    elementary_id_mms: '',
    elementary_id_kash: '',
    elementary_id_passport: '',
    elementary_id_cooper_ninova: '',
    elementary_id_securities: ''
  })

  const [addForm, setAddForm] = useState({
    agent_name: '',
    agent_id: '',
    inspector: '',
    department: '',
    company_id: [],
    category: '',
    phone: '',
    email: '',
    is_active: 'active',
    insurance_type: '',
    insurance: false,
    elementary: false,
    ayalon_agent_id: '',
    harel_agent_id: '',
    migdal_agent_id: '',
    menorah_agent_id: '',
    phoenix_agent_id: '',
    clal_agent_id: '',
    altshuler_agent_id: '',
    hachshara_agent_id: '',
    mor_agent_id: '',
    mediho_agent_id: '',
    analyst_agent_id: '',
    commission_id_ayalon: '',
    commission_id_phoenix: '',
    commission_id_harel: '',
    commission_id_clal: '',
    commission_id_migdal: '',
    commission_id_menorah: '',
    commission_id_passportcard: '',
    commission_id_altshuler: '',
    commission_id_excellence: '',
    commission_id_hachshara: '',
    commission_id_mediho: '',
    commission_id_mor: '',
    commission_id_analyst: '',
    elementary_id_ayalon: '',
    elementary_id_hachshara: '',
    elementary_id_harel: '',
    elementary_id_clal: '',
    elementary_id_migdal: '',
    elementary_id_menorah: '',
    elementary_id_phoenix: '',
    elementary_id_shomera: '',
    elementary_id_shlomo: '',
    elementary_id_shirbit: '',
    elementary_id_haklai: '',
    elementary_id_mms: '',
    elementary_id_kash: '',
    elementary_id_passport: '',
    elementary_id_cooper_ninova: '',
    elementary_id_securities: ''
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    if (deleteModal.isOpen || updateModal.isOpen || addModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [deleteModal.isOpen, updateModal.isOpen, addModal])

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true)
      const response = await fetch(API_ENDPOINTS.companies)
      const result = await response.json()
      
      if (result.success) {
        setCompanies(result.data)
      } else {
        setError('Failed to load companies')
      }
    } catch (err) {
      setError('Error loading companies: ' + err.message)
    } finally {
      setLoadingCompanies(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build URL with optional company filter
      let url = API_ENDPOINTS.agents;
      if (selectedCompany) {
        url += `?company_id=${selectedCompany}`;
      }
      
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }
  
      const result = await response.json()
      
      if (result.success) {
        setAgents(result.data)
        setFilteredAgents(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch agents')
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching agents:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Update this useEffect - add fetchAgents to dependency
  useEffect(() => {
    fetchAgents()
  }, [selectedCompany])
  
  // Update the filtering useEffect - REMOVE company filtering
  useEffect(() => {
    let filtered = agents
  
    // Company filtering now happens on backend, so remove this:
    // if (selectedCompany) { ... }
  
    if (searchQuery) {
      filtered = filtered.filter(agent => {
        const searchLower = searchQuery.toLowerCase()
        return (
          agent.agent_name?.toLowerCase().includes(searchLower) ||
          agent.agent_id?.toString().toLowerCase().includes(searchLower) ||
          agent.inspector?.toLowerCase().includes(searchLower) ||
          agent.department?.toLowerCase().includes(searchLower) ||
          agent.email?.toLowerCase().includes(searchLower) ||
          agent.phone?.toLowerCase().includes(searchLower) ||
          agent.category?.toLowerCase().includes(searchLower)
        )
      })
    }
  
    setFilteredAgents(filtered)
    setCurrentPage(1)
  }, [searchQuery, agents])

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Helper function to format status display
  const getStatusDisplay = (statusValue) => {
    // Handle NULL or undefined values
    if (statusValue === null || statusValue === undefined || statusValue === '') {
      return {
        label: t('empty'),
        color: 'bg-gray-50 text-gray-400'
      }
    }

    const statusMap = {
      'active': { key: 'active', color: 'bg-blue-100 text-blue-800' },
      'inactive': { key: 'inactive', color: 'bg-red-100 text-red-800' },
      'independent_agent': { key: 'independentAgent', color: 'bg-green-100 text-green-800' },
      'former_employee': { key: 'formerEmployee', color: 'bg-gray-100 text-gray-800' },
      'former_independent_agent': { key: 'formerIndependentAgent', color: 'bg-gray-100 text-gray-800' },
      // Legacy support for old values
      'yes': { key: 'active', color: 'bg-green-100 text-green-800' },
      'Yes': { key: 'active', color: 'bg-green-100 text-green-800' },
      'no': { key: 'inactive', color: 'bg-red-100 text-red-800' },
      'No': { key: 'inactive', color: 'bg-red-100 text-red-800' }
    }

    const status = statusMap[statusValue] || { key: 'empty', color: 'bg-gray-50 text-gray-400' }
    return {
      label: t(status.key),
      color: status.color
    }
  }

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue = a[sortColumn]
    let bValue = b[sortColumn]

    if (aValue == null) aValue = ''
    if (bValue == null) bValue = ''

    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedAgents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentAgents = sortedAgents.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const openDeleteModal = (agent) => {
    setDeleteModal({ isOpen: true, agent })
    setModalError(null)
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, agent: null })
    setModalError(null)
  }

  const confirmDelete = async () => {
    if (!deleteModal.agent) return

    try {
      setModalError(null)
      const response = await fetch(`${API_ENDPOINTS.agents}/${deleteModal.agent.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete agent')
      }

      setSuccessMessage('Agent deleted successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      closeDeleteModal()
      fetchAgents()
    } catch (err) {
      setModalError(err.message)
    }
  }

  const openUpdateModal = (agent) => {
    setUpdateModal({ isOpen: true, agent })
    setModalError(null)
    setUpdateForm({
      agent_name: agent.agent_name || '',
      agent_id: agent.agent_id || '',
      inspector: agent.inspector || '',
      department: agent.department || '',
      company_id: agent.company_id || [],
      category: agent.category || '',
      phone: agent.phone || '',
      email: agent.email || '',
      is_active: agent.is_active || 'employee_gal_amagor',
      insurance_type: agent.insurance_type || '',
      insurance: agent.insurance || false,
      elementary: agent.elementary || false,
      ayalon_agent_id: agent.ayalon_agent_id || '',
      harel_agent_id: agent.harel_agent_id || '',
      migdal_agent_id: agent.migdal_agent_id || '',
      menorah_agent_id: agent.menorah_agent_id || '',
      phoenix_agent_id: agent.phoenix_agent_id || '',
      clal_agent_id: agent.clal_agent_id || '',
      altshuler_agent_id: agent.altshuler_agent_id || '',
      hachshara_agent_id: agent.hachshara_agent_id || '',
      mor_agent_id: agent.mor_agent_id || '',
      mediho_agent_id: agent.mediho_agent_id || '',
      analyst_agent_id: agent.analyst_agent_id || '',
      commission_id_ayalon: agent.commission_id_ayalon || '',
      commission_id_phoenix: agent.commission_id_phoenix || '',
      commission_id_harel: agent.commission_id_harel || '',
      commission_id_clal: agent.commission_id_clal || '',
      commission_id_migdal: agent.commission_id_migdal || '',
      commission_id_menorah: agent.commission_id_menorah || '',
      commission_id_passportcard: agent.commission_id_passportcard || '',
      commission_id_altshuler: agent.commission_id_altshuler || '',
      commission_id_excellence: agent.commission_id_excellence || '',
      commission_id_hachshara: agent.commission_id_hachshara || '',
      commission_id_mediho: agent.commission_id_mediho || '',
      commission_id_mor: agent.commission_id_mor || '',
      commission_id_analyst: agent.commission_id_analyst || '',
      elementary_id_ayalon: agent.elementary_id_ayalon || '',
      elementary_id_hachshara: agent.elementary_id_hachshara || '',
      elementary_id_harel: agent.elementary_id_harel || '',
      elementary_id_clal: agent.elementary_id_clal || '',
      elementary_id_migdal: agent.elementary_id_migdal || '',
      elementary_id_menorah: agent.elementary_id_menorah || '',
      elementary_id_phoenix: agent.elementary_id_phoenix || '',
      elementary_id_shomera: agent.elementary_id_shomera || '',
      elementary_id_shlomo: agent.elementary_id_shlomo || '',
      elementary_id_shirbit: agent.elementary_id_shirbit || '',
      elementary_id_haklai: agent.elementary_id_haklai || '',
      elementary_id_mms: agent.elementary_id_mms || '',
      elementary_id_kash: agent.elementary_id_kash || '',
      elementary_id_passport: agent.elementary_id_passport || '',
      elementary_id_cooper_ninova: agent.elementary_id_cooper_ninova || '',
      elementary_id_securities: agent.elementary_id_securities || ''
    })
  }

  const closeUpdateModal = () => {
    setUpdateModal({ isOpen: false, agent: null })
    setModalError(null)
    setIsSaving(false)
    setUpdateForm({
      agent_name: '',
      agent_id: '',
      inspector: '',
      department: '',
      company_id: [],
      category: '',
      phone: '',
      email: '',
      is_active: 'active',
      insurance_type: '',
      ayalon_agent_id: '',
      harel_agent_id: '',
      migdal_agent_id: '',
      menorah_agent_id: '',
      phoenix_agent_id: '',
      clal_agent_id: '',
      altshuler_agent_id: '',
      hachshara_agent_id: '',
      mor_agent_id: '',
      mediho_agent_id: '',
      analyst_agent_id: '',
      commission_id_ayalon: '',
      commission_id_phoenix: '',
      commission_id_harel: '',
      commission_id_clal: '',
      commission_id_migdal: '',
      commission_id_menorah: '',
      commission_id_passportcard: '',
      commission_id_altshuler: '',
      commission_id_excellence: '',
      commission_id_hachshara: '',
      commission_id_mediho: '',
      commission_id_mor: '',
      commission_id_analyst: ''
    })
  }

  const handleUpdateFormChange = (field, value) => {
    setUpdateForm(prev => ({ ...prev, [field]: value }))
  }

  // Auto-generate company_id based on which agent ID fields are filled
  const generateCompanyIds = (formData) => {
    const companyIds = []

    // Mapping of company IDs to their associated fields
    const companyFieldMapping = {
      '1': ['ayalon_agent_id', 'elementary_id_ayalon', 'commission_id_ayalon'],
      '2': ['altshuler_agent_id', 'commission_id_altshuler'],
      '3': ['analyst_agent_id', 'commission_id_analyst'],
      '4': ['hachshara_agent_id', 'elementary_id_hachshara', 'commission_id_hachshara'],
      '5': ['phoenix_agent_id', 'elementary_id_phoenix', 'commission_id_phoenix'],
      '6': ['harel_agent_id', 'elementary_id_harel', 'commission_id_harel'],
      '7': ['clal_agent_id', 'elementary_id_clal', 'commission_id_clal'],
      '8': ['migdal_agent_id', 'elementary_id_migdal', 'commission_id_migdal'],
      '9': ['mediho_agent_id', 'commission_id_mediho'],
      '10': ['mor_agent_id', 'commission_id_mor'],
      '11': ['menorah_agent_id', 'elementary_id_menorah', 'commission_id_menorah'],
      '12': ['elementary_id_shomera'],
      '13': ['elementary_id_shlomo'],
      '14': ['elementary_id_shirbit'],
      '15': ['elementary_id_haklai'],
      '16': ['elementary_id_mms'],
      '27': ['elementary_id_kash'],
      '19': ['elementary_id_passport', 'commission_id_passportcard'],
      '20': ['commission_id_excellence'],
      '21': ['elementary_id_cooper_ninova'],
      '23': ['elementary_id_securities']
    }

    // Check each company and add its ID if any associated field has a value
    Object.entries(companyFieldMapping).forEach(([companyId, fields]) => {
      const hasValue = fields.some(field => {
        const value = formData[field]
        return value && value.toString().trim() !== ''
      })

      if (hasValue) {
        companyIds.push(companyId)
      }
    })

    return companyIds
  }

  const confirmUpdate = async () => {
    if (!updateModal.agent) return

    // Auto-detect insurance based on Agent ID דוחות תפוקה fields
    const hasInsuranceId = !!(
      updateForm.ayalon_agent_id ||
      updateForm.harel_agent_id ||
      updateForm.migdal_agent_id ||
      updateForm.menorah_agent_id ||
      updateForm.phoenix_agent_id ||
      updateForm.clal_agent_id ||
      updateForm.altshuler_agent_id ||
      updateForm.hachshara_agent_id ||
      updateForm.mor_agent_id ||
      updateForm.mediho_agent_id ||
      updateForm.analyst_agent_id
    )

    // Auto-detect elementary based on Agent ID אלמנטרי fields
    const hasElementaryId = !!(
      updateForm.elementary_id_ayalon ||
      updateForm.elementary_id_hachshara ||
      updateForm.elementary_id_harel ||
      updateForm.elementary_id_clal ||
      updateForm.elementary_id_migdal ||
      updateForm.elementary_id_menorah ||
      updateForm.elementary_id_phoenix ||
      updateForm.elementary_id_shomera ||
      updateForm.elementary_id_shlomo ||
      updateForm.elementary_id_shirbit ||
      updateForm.elementary_id_haklai ||
      updateForm.elementary_id_mms ||
      updateForm.elementary_id_kash ||
      updateForm.elementary_id_passport ||
      updateForm.elementary_id_cooper_ninova ||
      updateForm.elementary_id_securities
    )

    // Auto-generate company_id based on filled agent ID fields
    const autoGeneratedCompanyIds = generateCompanyIds(updateForm)

    const formDataToSubmit = {
      ...updateForm,
      insurance: hasInsuranceId,
      elementary: hasElementaryId,
      company_id: autoGeneratedCompanyIds
    }

    try {
      setModalError(null)
      setIsSaving(true)

      const response = await fetch(`${API_ENDPOINTS.agents}/${updateModal.agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataToSubmit)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update agent')
      }

      // Show success message with re-aggregation info
      let successMsg = 'Agent updated successfully!'
      if (result.reAggregation) {
        const lifeTotal = result.reAggregation.lifeInsurance.monthsReAggregated || 0
        const elemTotal = result.reAggregation.elementary.monthsReAggregated || 0
        const lifeDeleted = result.reAggregation.lifeInsurance.aggregationsDeleted || 0
        const elemDeleted = result.reAggregation.elementary.aggregationsDeleted || 0

        if (lifeTotal > 0 || elemTotal > 0) {
          successMsg += ` Re-aggregated ${lifeTotal + elemTotal} month(s) of data.`
        }
        if (lifeDeleted > 0 || elemDeleted > 0) {
          successMsg += ` Removed ${lifeDeleted + elemDeleted} old aggregation(s).`
        }
      }

      setSuccessMessage(successMsg)
      setTimeout(() => setSuccessMessage(null), 5000)
      closeUpdateModal()
      fetchAgents()
    } catch (err) {
      setModalError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Add Agent functions
  const openAddModal = () => {
    setAddModal(true)
    setModalError(null)
    setAddForm({
      agent_name: '',
      agent_id: '',
      inspector: '',
      department: '',
      company_id: [],
      category: '',
      phone: '',
      email: '',
      is_active: 'active',
      insurance_type: ''
    })
  }

  const closeAddModal = () => {
    setAddModal(false)
    setModalError(null)
    setAddForm({
      agent_name: '',
      agent_id: '',
      inspector: '',
      department: '',
      company_id: [],
      category: '',
      phone: '',
      email: '',
      is_active: 'active',
      insurance_type: '',
      ayalon_agent_id: '',
      harel_agent_id: '',
      migdal_agent_id: '',
      menorah_agent_id: '',
      phoenix_agent_id: '',
      clal_agent_id: '',
      altshuler_agent_id: '',
      hachshara_agent_id: '',
      mor_agent_id: '',
      mediho_agent_id: '',
      analyst_agent_id: '',
      commission_id_ayalon: '',
      commission_id_phoenix: '',
      commission_id_harel: '',
      commission_id_clal: '',
      commission_id_migdal: '',
      commission_id_menorah: '',
      commission_id_passportcard: '',
      commission_id_altshuler: '',
      commission_id_excellence: '',
      commission_id_hachshara: '',
      commission_id_mediho: '',
      commission_id_mor: '',
      commission_id_analyst: ''
    })
  }

  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({ ...prev, [field]: value }))
  }

  const confirmAdd = async () => {
  if (!addForm.agent_name) {
    setModalError('Agent name is required')
    return
  }

    // Auto-detect insurance based on Agent ID דוחות תפוקה fields
    const hasInsuranceId = !!(
      addForm.ayalon_agent_id ||
      addForm.harel_agent_id ||
      addForm.migdal_agent_id ||
      addForm.menorah_agent_id ||
      addForm.phoenix_agent_id ||
      addForm.clal_agent_id ||
      addForm.altshuler_agent_id ||
      addForm.hachshara_agent_id ||
      addForm.mor_agent_id ||
      addForm.mediho_agent_id ||
      addForm.analyst_agent_id
    )

    // Auto-detect elementary based on Agent ID אלמנטרי fields
    const hasElementaryId = !!(
      addForm.elementary_id_ayalon ||
      addForm.elementary_id_hachshara ||
      addForm.elementary_id_harel ||
      addForm.elementary_id_clal ||
      addForm.elementary_id_migdal ||
      addForm.elementary_id_menorah ||
      addForm.elementary_id_phoenix ||
      addForm.elementary_id_shomera ||
      addForm.elementary_id_shlomo ||
      addForm.elementary_id_shirbit ||
      addForm.elementary_id_haklai ||
      addForm.elementary_id_mms ||
      addForm.elementary_id_kash ||
      addForm.elementary_id_passport ||
      addForm.elementary_id_cooper_ninova ||
      addForm.elementary_id_securities
    )

    // Auto-generate company_id based on filled agent ID fields
    const autoGeneratedCompanyIds = generateCompanyIds(addForm)

    const formDataToSubmit = {
      ...addForm,
      insurance: hasInsuranceId,
      elementary: hasElementaryId,
      company_id: autoGeneratedCompanyIds
    }

    try {
      setModalError(null)
      const response = await fetch(API_ENDPOINTS.agents, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataToSubmit)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to add agent')
      }

      setSuccessMessage('Agent added successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      closeAddModal()
      fetchAgents()
    } catch (err) {
      setModalError(err.message)
    }
  }

  const selectedCompanyName = selectedCompany 
    ? companies.find(c => c.id === parseInt(selectedCompany))?.[language === 'he' ? 'name' : 'name_en']
    : null

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-brand-primary" />
      : <ArrowDown className="w-4 h-4 text-brand-primary" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{t('agentManagement')}</h2>
                <p className="text-gray-600">{t('manageAgentRecords')}</p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              {t('addAgent')}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="company-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('filterByCompany')}
              </label>
              <select
                id="company-filter"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                disabled={loadingCompanies}
              >
                <option value="">
                  {loadingCompanies ? 'Loading...' : t('allCompanies')}
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {language === 'he' ? company.name : company.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                {t('searchAgents')}
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
              />
            </div>
          </div>

          {(selectedCompany || searchQuery) && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm flex-wrap">
              <span className="text-gray-600 font-semibold">{t('activeFilters')}</span>
              {selectedCompany && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {selectedCompanyName}
                </span>
              )}
              {searchQuery && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  Search: "{searchQuery}"
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedCompany('')
                  setSearchQuery('')
                }}
                className="ml-2 text-gray-600 hover:text-red-600 underline text-xs"
              >
                {t('clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm font-semibold">{t('totalAgents')}</span>
              <UsersIcon className="w-8 h-8 text-blue-200" />
            </div>
            <p className="text-4xl font-bold">{agents.length}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100 text-sm font-semibold">{t('filteredResults')}</span>
              <Search className="w-8 h-8 text-purple-200" />
            </div>
            <p className="text-4xl font-bold">{filteredAgents.length}</p>
          </div>
        </div>

        {/* Agents Table */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
    <h3 className="text-lg font-bold text-gray-900">{t('agentList')}</h3>
  </div>

  {loading ? (
    <div className="flex items-center justify-center py-16">
      <Loader className="w-8 h-8 text-brand-primary animate-spin" />
      <span className="ml-3 text-gray-600 font-medium">{t('loading')}</span>
    </div>
  ) : currentAgents.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-16">
      <UsersIcon className="w-16 h-16 text-gray-300 mb-4" />
      <p className="text-gray-600 font-medium">{t('noAgentsFound')}</p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th 
              onClick={() => handleSort('agent_name')}
              className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                {t('agentName')}
                <SortIcon column="agent_name" />
              </div>
            </th>
            <th 
              onClick={() => handleSort('agent_id')}
              className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                {t('agentNumber')}
                <SortIcon column="agent_id" />
              </div>
            </th>
            <th 
              onClick={() => handleSort('inspector')}
              className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                {t('inspector')}
                <SortIcon column="inspector" />
              </div>
            </th>
            <th 
              onClick={() => handleSort('department')}
              className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                {t('department')}
                <SortIcon column="department" />
              </div>
            </th>
            
            <th
              onClick={() => handleSort('is_active')}
              className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                {t('currentStatus')}
                <SortIcon column="is_active" />
              </div>
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50">
              {t('actions')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentAgents.map((agent, index) => {
            const isUnmapped = agent.agent_id?.startsWith('UNMAPPED_');
            return (
            <tr
              key={agent.id || index}
              className={`transition-colors ${
                isUnmapped
                  ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
                  : 'hover:bg-gray-50'
              }`}
            >
              <td className="px-6 py-4">
                <div className="flex items-center min-w-[200px] max-w-[300px]">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3 flex-shrink-0 ${
                    isUnmapped
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      : 'bg-gradient-to-br from-purple-500 to-purple-600'
                  }`}>
                    {isUnmapped ? '⚠' : (agent.agent_name?.charAt(0).toUpperCase() || '?')}
                  </div>
                  <div className="flex flex-col">
                    <div className="font-semibold text-gray-900 truncate">
                      {agent.agent_name || 'N/A'}
                    </div>
                    {isUnmapped && (
                      <span className="text-xs text-yellow-700 font-medium mt-0.5">
                        {t('unmappedAgentBadge') || 'סוכן מערכת - נתונים כלליים'}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {agent.agent_id || 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-700 max-w-[150px]">
                <span className="truncate block">{agent.inspector || 'N/A'}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-700 max-w-[150px]">
                <span className="truncate block">{agent.department || 'N/A'}</span>
              </td>
          
              <td className="px-6 py-4 whitespace-nowrap">
                {(() => {
                  const status = getStatusDisplay(agent.is_active)
                  return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                  )
                })()}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-right sticky right-0 ${isUnmapped ? 'bg-yellow-50' : 'bg-white'}`}>
                <div className="flex items-center justify-end gap-2">
                  {!isUnmapped ? (
                    <>
                      <button
                        onClick={() => openUpdateModal(agent)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('update')}
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(agent)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-3">
                      <Info className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs text-gray-600 font-medium">
                        {t('unmappedAgentInfo') || 'אוסף נתוני מכירות לא מזוהים'}
                      </span>
                    </div>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}

          {/* Pagination */}
          {!loading && filteredAgents.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t('showing')} <span className="font-semibold">{startIndex + 1}</span>-
                  <span className="font-semibold">{Math.min(endIndex, sortedAgents.length)}</span> {t('of')}{' '}
                  <span className="font-semibold">{sortedAgents.length}</span> {t('agents')}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1
                        const showPage =
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)

                        if (!showPage) {
                          if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                            return (
                              <span key={pageNumber} className="px-2 text-gray-500">
                                ...
                              </span>
                            )
                          }
                          return null
                        }

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => goToPage(pageNumber)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              currentPage === pageNumber
                                ? 'bg-brand-primary text-white'
                                : 'text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
              onClick={closeDeleteModal}
            />
            
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                {modalError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 text-sm">{modalError}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{t('confirmDelete')}</h3>
                    <p className="text-sm text-gray-600">{t('thisActionCannotBeUndone')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">{t('agentName')}:</span> {deleteModal.agent?.agent_name || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">{t('agentNumber')}:</span> #{deleteModal.agent?.agent_id || 'N/A'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeDeleteModal}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                  >
                    {t('deleteAgent')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Update Agent Modal */}
        {/* Update Agent Modal */}
{updateModal.isOpen && (
  <>
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
      onClick={closeUpdateModal}
    />

    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl animate-fadeIn relative">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('updateAgent')}</h3>
                <p className="text-sm text-gray-600">{t('editAgentInformation')}</p>
              </div>
            </div>
            <button
              onClick={closeUpdateModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Sticky Error Message for Update Modal */}
          {modalError && (
            <div className="sticky top-0 z-10 mx-6 mt-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 shadow-md">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-red-800 text-sm font-medium">{modalError}</span>
              <button
                onClick={() => setModalError(null)}
                className="ml-auto p-1 hover:bg-red-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}

          <div className="p-6 max-h-[calc(100vh-280px)] overflow-y-auto">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('agentName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={updateForm.agent_name}
                  onChange={(e) => handleUpdateFormChange('agent_name', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterAgentName')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('agentNumber')}
                </label>
                <input
                  type="text"
                  value={updateForm.agent_id}
                  onChange={(e) => handleUpdateFormChange('agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterAgentNumber')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={updateForm.email}
                  onChange={(e) => handleUpdateFormChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterEmail')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {t('phone')}
                </label>
                <input
                  type="tel"
                  value={updateForm.phone}
                  onChange={(e) => handleUpdateFormChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterPhone')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('inspector')}
                </label>
                <input
                  type="text"
                  value={updateForm.inspector}
                  onChange={(e) => handleUpdateFormChange('inspector', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterInspectorName')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('departmentLifeInsurance')}
                </label>
                <select
                  value={updateForm.department}
                  onChange={(e) => handleUpdateFormChange('department', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                >
                  <option value="">{t('selectDepartmentLifeInsurance')}</option>
                  <option value="ישירים">{t('departmentYashirim')}</option>
                  <option value="סוכנים">{t('departmentSochnim')}</option>
                  <option value="פרמיום">{t('departmentPremium')}</option>
                  <option value="שותפים">{t('departmentShutafim')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  {t('departmentElementary')}
                </label>
                <select
                  value={updateForm.category}
                  onChange={(e) => handleUpdateFormChange('category', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                >
                  <option value="">{t('selectDepartmentElementary')}</option>
                  <option value="סוכנים יהלומה">{t('departmentSochnimYahaloma')}</option>
                  <option value="חברות שותפות יהלומה">{t('departmentChavrotShutafotYahaloma')}</option>
                  <option value="חברות שותפים">{t('departmentChavrotShutafim')}</option>
                  <option value="ישירים סיגל">{t('departmentYashirimSigal')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('currentStatus')}
                </label>
                <select
                  value={updateForm.is_active}
                  onChange={(e) => handleUpdateFormChange('is_active', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                >
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                  <option value="independent_agent">{t('independentAgent')}</option>
                  <option value="former_employee">{t('formerEmployee')}</option>
                  <option value="former_independent_agent">{t('formerIndependentAgent')}</option>
                </select>
              </div>

              {/* Company-specific Agent IDs */}
              <div className="col-span-full">
                <h4 className="text-sm font-bold text-gray-700 mb-1 border-b pb-2 mt-4">
                  Agent ID דוחות תפוקה
                </h4>
                <p className="text-xs text-gray-500 mb-3 mt-1">
                  {t('multipleIdsFormat')}
                </p>
              </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('ayalonAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.ayalon_agent_id}
                  onChange={(e) => handleUpdateFormChange('ayalon_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('ayalonId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('harelAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.harel_agent_id}
                  onChange={(e) => handleUpdateFormChange('harel_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('harelId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('migdalAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.migdal_agent_id}
                  onChange={(e) => handleUpdateFormChange('migdal_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('migdalId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('menorahAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.menorah_agent_id}
                  onChange={(e) => handleUpdateFormChange('menorah_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('menorahId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('phoenixAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.phoenix_agent_id}
                  onChange={(e) => handleUpdateFormChange('phoenix_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('phoenixId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('clalAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.clal_agent_id}
                  onChange={(e) => handleUpdateFormChange('clal_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('clalId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('altshulerAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.altshuler_agent_id}
                  onChange={(e) => handleUpdateFormChange('altshuler_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('altshulerId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('hachsharaAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.hachshara_agent_id}
                  onChange={(e) => handleUpdateFormChange('hachshara_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('hachsharaId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('morAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.mor_agent_id}
                  onChange={(e) => handleUpdateFormChange('mor_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('morId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('medihoAgentId')}
                </label>
                <input
                  type="text"
                  value={updateForm.mediho_agent_id}
                  onChange={(e) => handleUpdateFormChange('mediho_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('medihoId')}
                />
              </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('analystAgentName')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.analyst_agent_id}
                      onChange={(e) => handleUpdateFormChange('analyst_agent_id', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('analystName')}
                    />
                  </div>

              {/* Elementary Agent IDs */}
              <div className="col-span-full">
                <h4 className="text-sm font-bold text-gray-700 mb-1 border-b pb-2 mt-4">
                  Agent ID אלמנטרי
                </h4>
                <p className="text-xs text-gray-500 mb-3 mt-1">
                  {t('multipleIdsFormat')}
                </p>
              </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('ayalonElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_ayalon}
                      onChange={(e) => handleUpdateFormChange('elementary_id_ayalon', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('ayalonElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('hachsharaElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_hachshara}
                      onChange={(e) => handleUpdateFormChange('elementary_id_hachshara', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('hachsharaElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('harelElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_harel}
                      onChange={(e) => handleUpdateFormChange('elementary_id_harel', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('harelElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('clalElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_clal}
                      onChange={(e) => handleUpdateFormChange('elementary_id_clal', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('clalElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('migdalElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_migdal}
                      onChange={(e) => handleUpdateFormChange('elementary_id_migdal', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('migdalElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('menorahElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_menorah}
                      onChange={(e) => handleUpdateFormChange('elementary_id_menorah', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('menorahElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('phoenixElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_phoenix}
                      onChange={(e) => handleUpdateFormChange('elementary_id_phoenix', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('phoenixElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('shomeraElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_shomera}
                      onChange={(e) => handleUpdateFormChange('elementary_id_shomera', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('shomeraElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('shlomoElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_shlomo}
                      onChange={(e) => handleUpdateFormChange('elementary_id_shlomo', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('shlomoElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('shirbitElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_shirbit}
                      onChange={(e) => handleUpdateFormChange('elementary_id_shirbit', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('shirbitElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('haklaiElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_haklai}
                      onChange={(e) => handleUpdateFormChange('elementary_id_haklai', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('haklaiElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('mmsElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_mms}
                      onChange={(e) => handleUpdateFormChange('elementary_id_mms', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('mmsElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('kashElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_kash}
                      onChange={(e) => handleUpdateFormChange('elementary_id_kash', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('kashElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('passportElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_passport}
                      onChange={(e) => handleUpdateFormChange('elementary_id_passport', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('passportElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('cooperNinovaElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_cooper_ninova}
                      onChange={(e) => handleUpdateFormChange('elementary_id_cooper_ninova', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('cooperNinovaElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('securitiesElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={updateForm.elementary_id_securities}
                      onChange={(e) => handleUpdateFormChange('elementary_id_securities', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('securitiesElementaryPlaceholder')}
                    />
                  </div>

                  {/* Company-specific Commission IDs */}
                  {/* <div className="col-span-full">
                    <h4 className="text-sm font-bold text-gray-700 mb-1 border-b pb-2 mt-4">
                      Agent ID דוחות עמלות
                    </h4>
                    <p className="text-xs text-gray-500 mb-3 mt-1">
                      {t('multipleIdsFormat')}
                    </p>
                  </div> */}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('ayalonCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_ayalon}
                  onChange={(e) => handleUpdateFormChange('commission_id_ayalon', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('ayalonCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('phoenixCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_phoenix}
                  onChange={(e) => handleUpdateFormChange('commission_id_phoenix', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('phoenixCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('harelCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_harel}
                  onChange={(e) => handleUpdateFormChange('commission_id_harel', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('harelCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('clalCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_clal}
                  onChange={(e) => handleUpdateFormChange('commission_id_clal', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('clalCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('migdalCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_migdal}
                  onChange={(e) => handleUpdateFormChange('commission_id_migdal', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('migdalCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('menorahCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_menorah}
                  onChange={(e) => handleUpdateFormChange('commission_id_menorah', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('menorahCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('passportcardCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_passportcard}
                  onChange={(e) => handleUpdateFormChange('commission_id_passportcard', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('passportcardCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('altshulerCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_altshuler}
                  onChange={(e) => handleUpdateFormChange('commission_id_altshuler', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('altshulerCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('excellenceCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_excellence}
                  onChange={(e) => handleUpdateFormChange('commission_id_excellence', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('excellenceCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('hachsharaCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_hachshara}
                  onChange={(e) => handleUpdateFormChange('commission_id_hachshara', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('hachsharaCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('medihoCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_mediho}
                  onChange={(e) => handleUpdateFormChange('commission_id_mediho', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('medihoCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('morCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_mor}
                  onChange={(e) => handleUpdateFormChange('commission_id_mor', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('morCommissionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('analystCommissionId')}
                </label>
                <input
                  type="text"
                  value={updateForm.commission_id_analyst}
                  onChange={(e) => handleUpdateFormChange('commission_id_analyst', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('analystCommissionPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={closeUpdateModal}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              onClick={confirmUpdate}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && <Loader className="w-5 h-5 animate-spin" />}
              {isSaving ? t('saving') || 'Saving...' : t('saveChanges')}
            </button>
          </div>

          {/* Loading Overlay */}
          {isSaving && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
              <div className="text-center">
                <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {t('updatingAgent') || 'Updating Agent...'}
                </p>
                <p className="text-sm text-gray-600">
                  {t('reAggregatingData') || 'Re-aggregating data for affected companies. This may take a moment.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
)}

        {/* Add Agent Modal */}
        {/* Add Agent Modal */}
{addModal && (
  <>
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
      onClick={closeAddModal}
    />
    
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl animate-fadeIn relative">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('addAgent')}</h3>
                <p className="text-sm text-gray-600">{t('createNewAgentRecord')}</p>
              </div>
            </div>
            <button
              onClick={closeAddModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Sticky Error Message for Add Modal */}
          {modalError && (
            <div className="sticky top-0 z-10 mx-6 mt-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 shadow-md">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-red-800 text-sm font-medium">{modalError}</span>
              <button
                onClick={() => setModalError(null)}
                className="ml-auto p-1 hover:bg-red-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}

          <div className="p-6 max-h-[calc(100vh-280px)] overflow-y-auto">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('agentName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.agent_name}
                  onChange={(e) => handleAddFormChange('agent_name', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterAgentName')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('agentNumber')}
                </label>
                <input
                  type="text"
                  value={addForm.agent_id}
                  onChange={(e) => handleAddFormChange('agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterAgentNumber')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => handleAddFormChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterEmail')}
                />
              </div>
              

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {t('phone')}
                </label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => handleAddFormChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterPhone')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('inspector')}
                </label>
                <input
                  type="text"
                  value={addForm.inspector}
                  onChange={(e) => handleAddFormChange('inspector', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('enterInspectorName')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('departmentLifeInsurance')}
                </label>
                <select
                  value={addForm.department}
                  onChange={(e) => handleAddFormChange('department', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                >
                  <option value="">{t('selectDepartmentLifeInsurance')}</option>
                  <option value="ישירים">{t('departmentYashirim')}</option>
                  <option value="סוכנים">{t('departmentSochnim')}</option>
                  <option value="פרמיום">{t('departmentPremium')}</option>
                  <option value="שותפים">{t('departmentShutafim')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  {t('departmentElementary')}
                </label>
                <select
                  value={addForm.category}
                  onChange={(e) => handleAddFormChange('category', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                >
                  <option value="">{t('selectDepartmentElementary')}</option>
                  <option value="סוכנים יהלומה">{t('departmentSochnimYahaloma')}</option>
                  <option value="חברות שותפות יהלומה">{t('departmentChavrotShutafotYahaloma')}</option>
                  <option value="חברות שותפים">{t('departmentChavrotShutafim')}</option>
                  <option value="ישירים סיגל">{t('departmentYashirimSigal')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('currentStatus')}
                </label>
                <select
                  value={addForm.is_active}
                  onChange={(e) => handleAddFormChange('is_active', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                >
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                  <option value="independent_agent">{t('independentAgent')}</option>
                  <option value="former_employee">{t('formerEmployee')}</option>
                  <option value="former_independent_agent">{t('formerIndependentAgent')}</option>
                </select>
              </div>

              {/* Company-specific Agent IDs */}
              <div className="col-span-full">
                <h4 className="text-sm font-bold text-gray-700 mb-1 border-b pb-2 mt-4">
                  Agent ID דוחות תפוקה
                </h4>
                <p className="text-xs text-gray-500 mb-3 mt-1">
                  {t('multipleIdsFormat')}
                </p>
              </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('ayalonAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.ayalon_agent_id}
                  onChange={(e) => handleAddFormChange('ayalon_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('ayalonId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('harelAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.harel_agent_id}
                  onChange={(e) => handleAddFormChange('harel_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('harelId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('migdalAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.migdal_agent_id}
                  onChange={(e) => handleAddFormChange('migdal_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('migdalId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('menorahAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.menorah_agent_id}
                  onChange={(e) => handleAddFormChange('menorah_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('menorahId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('phoenixAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.phoenix_agent_id}
                  onChange={(e) => handleAddFormChange('phoenix_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('phoenixId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('clalAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.clal_agent_id}
                  onChange={(e) => handleAddFormChange('clal_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('clalId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('altshulerAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.altshuler_agent_id}
                  onChange={(e) => handleAddFormChange('altshuler_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('altshulerId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('hachsharaAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.hachshara_agent_id}
                  onChange={(e) => handleAddFormChange('hachshara_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('hachsharaId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('morAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.mor_agent_id}
                  onChange={(e) => handleAddFormChange('mor_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('morId')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('medihoAgentId')}
                </label>
                <input
                  type="text"
                  value={addForm.mediho_agent_id}
                  onChange={(e) => handleAddFormChange('mediho_agent_id', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                  placeholder={t('medihoId')}
                />
              </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('analystAgentName')}
                    </label>
                    <input
                      type="text"
                      value={addForm.analyst_agent_id}
                      onChange={(e) => handleAddFormChange('analyst_agent_id', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('analystName')}
                    />
                  </div>

              {/* Elementary Agent IDs */}
              <div className="col-span-full">
                <h4 className="text-sm font-bold text-gray-700 mb-1 border-b pb-2 mt-4">
                  Agent ID אלמנטרי
                </h4>
                <p className="text-xs text-gray-500 mb-3 mt-1">
                  {t('multipleIdsFormat')}
                </p>
              </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('ayalonElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_ayalon}
                      onChange={(e) => handleAddFormChange('elementary_id_ayalon', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('ayalonElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('hachsharaElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_hachshara}
                      onChange={(e) => handleAddFormChange('elementary_id_hachshara', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('hachsharaElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('harelElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_harel}
                      onChange={(e) => handleAddFormChange('elementary_id_harel', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('harelElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('clalElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_clal}
                      onChange={(e) => handleAddFormChange('elementary_id_clal', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('clalElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('migdalElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_migdal}
                      onChange={(e) => handleAddFormChange('elementary_id_migdal', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('migdalElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('menorahElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_menorah}
                      onChange={(e) => handleAddFormChange('elementary_id_menorah', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('menorahElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('phoenixElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_phoenix}
                      onChange={(e) => handleAddFormChange('elementary_id_phoenix', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('phoenixElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('shomeraElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_shomera}
                      onChange={(e) => handleAddFormChange('elementary_id_shomera', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('shomeraElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('shlomoElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_shlomo}
                      onChange={(e) => handleAddFormChange('elementary_id_shlomo', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('shlomoElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('shirbitElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_shirbit}
                      onChange={(e) => handleAddFormChange('elementary_id_shirbit', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('shirbitElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('haklaiElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_haklai}
                      onChange={(e) => handleAddFormChange('elementary_id_haklai', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('haklaiElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('mmsElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_mms}
                      onChange={(e) => handleAddFormChange('elementary_id_mms', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('mmsElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('kashElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_kash}
                      onChange={(e) => handleAddFormChange('elementary_id_kash', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('kashElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('passportElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_passport}
                      onChange={(e) => handleAddFormChange('elementary_id_passport', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('passportElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('cooperNinovaElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_cooper_ninova}
                      onChange={(e) => handleAddFormChange('elementary_id_cooper_ninova', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('cooperNinovaElementaryPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('securitiesElementaryId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.elementary_id_securities}
                      onChange={(e) => handleAddFormChange('elementary_id_securities', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('securitiesElementaryPlaceholder')}
                    />
                  </div>

                
                  {/* <div className="col-span-full">
                    <h4 className="text-sm font-bold text-gray-700 mb-1 border-b pb-2 mt-4">
                      Agent ID דוחות עמלות
                    </h4>
                    <p className="text-xs text-gray-500 mb-3 mt-1">
                      {t('multipleIdsFormat')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('ayalonCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_ayalon}
                      onChange={(e) => handleAddFormChange('commission_id_ayalon', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('ayalonCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('phoenixCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_phoenix}
                      onChange={(e) => handleAddFormChange('commission_id_phoenix', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('phoenixCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('harelCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_harel}
                      onChange={(e) => handleAddFormChange('commission_id_harel', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('harelCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('clalCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_clal}
                      onChange={(e) => handleAddFormChange('commission_id_clal', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('clalCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('migdalCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_migdal}
                      onChange={(e) => handleAddFormChange('commission_id_migdal', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('migdalCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('menorahCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_menorah}
                      onChange={(e) => handleAddFormChange('commission_id_menorah', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('menorahCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('passportcardCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_passportcard}
                      onChange={(e) => handleAddFormChange('commission_id_passportcard', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('passportcardCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('altshulerCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_altshuler}
                      onChange={(e) => handleAddFormChange('commission_id_altshuler', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('altshulerCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('excellenceCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_excellence}
                      onChange={(e) => handleAddFormChange('commission_id_excellence', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('excellenceCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('hachsharaCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_hachshara}
                      onChange={(e) => handleAddFormChange('commission_id_hachshara', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('hachsharaCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('medihoCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_mediho}
                      onChange={(e) => handleAddFormChange('commission_id_mediho', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('medihoCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('morCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_mor}
                      onChange={(e) => handleAddFormChange('commission_id_mor', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('morCommissionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('analystCommissionId')}
                    </label>
                    <input
                      type="text"
                      value={addForm.commission_id_analyst}
                      onChange={(e) => handleAddFormChange('commission_id_analyst', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900"
                      placeholder={t('analystCommissionPlaceholder')}
                    />
                  </div> */}
            </div>

          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={closeAddModal}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={confirmAdd}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              {t('addAgent')}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  </>
)}
      </main>
    </div>
  )
}

export default Agents