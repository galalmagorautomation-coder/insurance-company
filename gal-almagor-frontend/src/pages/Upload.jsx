import { useState, useEffect } from 'react'
import { Upload as UploadIcon, File, X, CheckCircle, Building2, Calendar, AlertCircle, Trash2, Loader, FileSpreadsheet } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Upload() {
  const { t, language } = useLanguage()
  const [dragActive1, setDragActive1] = useState(false)
  const [dragActive2, setDragActive2] = useState(false)
  const [dragActive3, setDragActive3] = useState(false)
  const [uploadedFile1, setUploadedFile1] = useState(null)
  const [uploadedFile2, setUploadedFile2] = useState(null)
  const [uploadedFile3, setUploadedFile3] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Form state
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  // Elementary tab states
  const [elementaryDragActive1, setElementaryDragActive1] = useState(false)
  const [elementaryDragActive2, setElementaryDragActive2] = useState(false)
  const [elementaryDragActive3, setElementaryDragActive3] = useState(false)
  const [elementaryDragActive4, setElementaryDragActive4] = useState(false)
  const [elementaryDragActive5, setElementaryDragActive5] = useState(false)
  const [elementaryUploadedFile1, setElementaryUploadedFile1] = useState(null)
  const [elementaryUploadedFile2, setElementaryUploadedFile2] = useState(null)
  const [elementaryUploadedFile3, setElementaryUploadedFile3] = useState(null)
  const [elementaryUploadedFile4, setElementaryUploadedFile4] = useState(null)
  const [elementaryUploadedFile5, setElementaryUploadedFile5] = useState(null)
  const [elementaryUploading, setElementaryUploading] = useState(false)
  const [elementaryError, setElementaryError] = useState(null)
  const [elementarySuccess, setElementarySuccess] = useState(null)
  const [elementarySelectedCompanyId, setElementarySelectedCompanyId] = useState('')
  const [elementarySelectedMonth, setElementarySelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteModalTab, setDeleteModalTab] = useState('regular') // 'regular' or 'direct-agents'
  const [records, setRecords] = useState([])
  const [directAgentsRecords, setDirectAgentsRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [deleteCompanyFilter, setDeleteCompanyFilter] = useState('')
  const [deleteMonthFilter, setDeleteMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [deleteSuccess, setDeleteSuccess] = useState(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState(null)

  // Tab state
  const [activeTab, setActiveTab] = useState('life-insurance')

  // Duplicate record detection
  const [existingRecord, setExistingRecord] = useState(null)
  const [checkingRecord, setCheckingRecord] = useState(false)
  const [elementaryExistingRecord, setElementaryExistingRecord] = useState(null)
  const [elementaryCheckingRecord, setElementaryCheckingRecord] = useState(false)

  // Direct Agents modal state
  const [directAgentsModalOpen, setDirectAgentsModalOpen] = useState(false)
  const [directAgentsFile, setDirectAgentsFile] = useState(null)
  const [directAgentsDragActive, setDirectAgentsDragActive] = useState(false)
  const [directAgentsUploading, setDirectAgentsUploading] = useState(false)
  const [directAgentsError, setDirectAgentsError] = useState(null)
  const [directAgentsSuccess, setDirectAgentsSuccess] = useState(null)
  const [directAgentsMonth, setDirectAgentsMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Tab configuration
  const tabs = [
    { id: 'life-insurance', labelEn: 'Life Insurance', labelHe: 'ביטוח חיים' },
    { id: 'elementary', labelEn: 'Elementary', labelHe: 'אלמנטרי' },
    { id: 'commission', labelEn: 'Commission', labelHe: 'נציבות' }
  ]

  // Fetch companies from backend on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.companies)
        const result = await response.json()

        if (result.success) {
          setCompanies(result.data)
        } else {
          setError('Failed to load companies')
        }
      } catch (err) {
        console.error('Error fetching companies:', err)
        setError('Failed to load companies')
      } finally {
        setLoadingCompanies(false)
      }
    }

    fetchCompanies()
  }, [])

  // Check for existing record when company or month changes (Life Insurance)
  useEffect(() => {
    const checkExistingRecord = async () => {
      if (!selectedCompanyId || !selectedMonth) {
        setExistingRecord(null)
        return
      }

      setCheckingRecord(true)
      try {
        const response = await fetch(`${API_ENDPOINTS.upload}/records?uploadType=life-insurance`)
        const result = await response.json()

        if (response.ok && result.success) {
          const existing = result.data.find(
            record => record.company_id === parseInt(selectedCompanyId) && record.month === selectedMonth
          )
          setExistingRecord(existing || null)
        }
      } catch (err) {
        console.error('Error checking existing record:', err)
      } finally {
        setCheckingRecord(false)
      }
    }

    checkExistingRecord()
  }, [selectedCompanyId, selectedMonth])

  // Clear uploaded files when company changes (in case file requirements change)
  useEffect(() => {
    if (uploadedFile1 || uploadedFile2 || uploadedFile3) {
      setUploadedFile1(null)
      setUploadedFile2(null)
      setUploadedFile3(null)
      setError(null)
      setSuccess(null)
    }
  }, [selectedCompanyId])

  const handleDrag = (e, slot) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (slot === 1) setDragActive1(true)
      else if (slot === 2) setDragActive2(true)
      else setDragActive3(true)
    } else if (e.type === 'dragleave') {
      if (slot === 1) setDragActive1(false)
      else if (slot === 2) setDragActive2(false)
      else setDragActive3(false)
    }
  }

  const handleDrop = (e, slot) => {
    e.preventDefault()
    e.stopPropagation()
    if (slot === 1) setDragActive1(false)
    else if (slot === 2) setDragActive2(false)
    else setDragActive3(false)
  
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files, slot)
    }
  }

  const handleChange = (e, slot) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files, slot)
    }
  }

  const handleFiles = (files, slot) => {
    const excelFile = Array.from(files).find(file =>
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xlsb') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    )

    if (!excelFile) {
      setError('Please upload only Excel files (.xlsx, .xlsb, or .xls)')
      return
    }

    setError(null)
    setSuccess(null)

    const fileObj = {
      file: excelFile,
      name: excelFile.name,
      size: (excelFile.size / 1024).toFixed(2) + ' KB',
      status: 'ready'
    }

    if (slot === 1) {
      setUploadedFile1(fileObj)
    } else if (slot === 2) {
      setUploadedFile2(fileObj)
    } else if (slot === 3) {
      setUploadedFile3(fileObj)
    }
  }

  const removeFile = (slot) => {
    if (slot === 1) {
      setUploadedFile1(null)
    } else if (slot === 2) {
      setUploadedFile2(null)
    } else if (slot === 3) {
      setUploadedFile3(null)
    }
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedCompanyId) {
      setError('Please select a company')
      return
    }
    if (!selectedMonth) {
      setError('Please select a month')
      return
    }
    if (!uploadedFile1) {
      setError('Please upload at least one Excel file')
      return
    }

    // Validation for Menorah: require both files
    const requiredFilesCount = getRequiredFilesCount(selectedCompanyId, 'life-insurance')
    if (parseInt(selectedCompanyId) === 11 && requiredFilesCount === 2) {
      if (!uploadedFile2) {
        setError('Menorah requires both files: regular life insurance file and pension transfer file')
        return
      }
    }

    // Files 2 and 3 are now optional for companies like Hachshara and Clal
    // The backend handles missing files gracefully with placeholder rows

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      let totalRowsInserted = 0
      const filesToUpload = [uploadedFile1]
      if (uploadedFile2) filesToUpload.push(uploadedFile2)
      if (uploadedFile3) filesToUpload.push(uploadedFile3)

      // Upload files sequentially
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileObj = filesToUpload[i]
        const formData = new FormData()

        formData.append('file', fileObj.file) // Backend expects 'file' not 'files'
        formData.append('companyId', selectedCompanyId)
        formData.append('month', selectedMonth)
        formData.append('uploadType', 'life-insurance') // Add upload type identifier

        const response = await fetch(`${API_ENDPOINTS.upload}/upload`, {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || `Upload failed for ${fileObj.name}`)
        }

        totalRowsInserted += result.summary?.rowsInserted || 0

        // Update file status
if (i === 0) {
  setUploadedFile1(prev => ({ ...prev, status: 'success' }))
} else if (i === 1) {
  setUploadedFile2(prev => ({ ...prev, status: 'success' }))
} else {
  setUploadedFile3(prev => ({ ...prev, status: 'success' }))
}
      }

      setSuccess(`Successfully uploaded ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}! ${totalRowsInserted} rows inserted.`)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'An error occurred during upload')
      if (uploadedFile1) setUploadedFile1(prev => ({ ...prev, status: 'error' }))
      if (uploadedFile2) setUploadedFile2(prev => ({ ...prev, status: 'error' }))
      if (uploadedFile3) setUploadedFile3(prev => ({ ...prev, status: 'error' }))
    } finally {
      setUploading(false)
    }
  }

  // Elementary tab handlers
  const handleElementaryDrag = (e, slot) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (slot === 1) setElementaryDragActive1(true)
      else if (slot === 2) setElementaryDragActive2(true)
      else if (slot === 3) setElementaryDragActive3(true)
      else if (slot === 4) setElementaryDragActive4(true)
      else if (slot === 5) setElementaryDragActive5(true)
    } else if (e.type === 'dragleave') {
      if (slot === 1) setElementaryDragActive1(false)
      else if (slot === 2) setElementaryDragActive2(false)
      else if (slot === 3) setElementaryDragActive3(false)
      else if (slot === 4) setElementaryDragActive4(false)
      else if (slot === 5) setElementaryDragActive5(false)
    }
  }

  const handleElementaryDrop = (e, slot) => {
    e.preventDefault()
    e.stopPropagation()
    if (slot === 1) setElementaryDragActive1(false)
    else if (slot === 2) setElementaryDragActive2(false)
    else if (slot === 3) setElementaryDragActive3(false)
    else if (slot === 4) setElementaryDragActive4(false)
    else if (slot === 5) setElementaryDragActive5(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleElementaryFiles(e.dataTransfer.files, slot)
    }
  }

  const handleElementaryChange = (e, slot) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleElementaryFiles(e.target.files, slot)
    }
  }

  const handleElementaryFiles = (files, slot) => {
    const excelFile = Array.from(files).find(file =>
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xlsb') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    )

    if (!excelFile) {
      setElementaryError('Please upload only Excel files (.xlsx, .xlsb, or .xls)')
      return
    }

    setElementaryError(null)
    setElementarySuccess(null)

    const fileObj = {
      file: excelFile,
      name: excelFile.name,
      size: (excelFile.size / 1024).toFixed(2) + ' KB',
      status: 'ready'
    }

    if (slot === 1) {
      setElementaryUploadedFile1(fileObj)
    } else if (slot === 2) {
      setElementaryUploadedFile2(fileObj)
    } else if (slot === 3) {
      setElementaryUploadedFile3(fileObj)
    } else if (slot === 4) {
      setElementaryUploadedFile4(fileObj)
    } else if (slot === 5) {
      setElementaryUploadedFile5(fileObj)
    }
  }

  const removeElementaryFile = (slot) => {
    if (slot === 1) {
      setElementaryUploadedFile1(null)
    } else if (slot === 2) {
      setElementaryUploadedFile2(null)
    } else if (slot === 3) {
      setElementaryUploadedFile3(null)
    } else if (slot === 4) {
      setElementaryUploadedFile4(null)
    } else if (slot === 5) {
      setElementaryUploadedFile5(null)
    }
    setElementaryError(null)
    setElementarySuccess(null)
  }

  const handleElementarySubmit = async (e) => {
    e.preventDefault()

    if (!elementarySelectedCompanyId) {
      setElementaryError('Please select a company')
      return
    }
    if (!elementarySelectedMonth) {
      setElementaryError('Please select a month')
      return
    }
    if (!elementaryUploadedFile1) {
      setElementaryError('Please upload at least one Excel file')
      return
    }

    // Files 2 and 3 are now optional for companies like Hachshara and Clal
    // The backend handles missing files gracefully with placeholder rows

    setElementaryUploading(true)
    setElementaryError(null)
    setElementarySuccess(null)

    try {
      let totalRowsInserted = 0
      const filesToUpload = [elementaryUploadedFile1]
      if (elementaryUploadedFile2) filesToUpload.push(elementaryUploadedFile2)
      if (elementaryUploadedFile3) filesToUpload.push(elementaryUploadedFile3)
      if (elementaryUploadedFile4) filesToUpload.push(elementaryUploadedFile4)
      if (elementaryUploadedFile5) filesToUpload.push(elementaryUploadedFile5)

      // Upload files sequentially
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileObj = filesToUpload[i]
        const formData = new FormData()

        formData.append('file', fileObj.file)
        formData.append('companyId', elementarySelectedCompanyId)
        formData.append('month', elementarySelectedMonth)
        formData.append('uploadType', 'elementary') // Add upload type identifier

        const response = await fetch(`${API_ENDPOINTS.upload}/upload`, {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (!response.ok) {
          // Check for column mismatch error (year/month mismatch)
          if (result.isColumnMismatch) {
            const errorMsg = language === 'he'
              ? 'אי התאמה בחודש/שנה: קובץ האקסל אינו מכיל נתונים לחודש והשנה שנבחרו. אנא העלה קובץ התואם לבחירתך, או בחר חודש/שנה שתואמים לעמודות הקובץ.'
              : 'Month/Year Mismatch: The Excel file does not contain data for the selected month and year. Please either upload a file that matches your selection, or choose a different month/year that matches the file columns.';
            throw new Error(errorMsg)
          }
          throw new Error(result.message || `Upload failed for ${fileObj.name}`)
        }

        totalRowsInserted += result.summary?.rowsInserted || 0

        // Update file status
        if (i === 0) {
          setElementaryUploadedFile1(prev => ({ ...prev, status: 'success' }))
        } else if (i === 1) {
          setElementaryUploadedFile2(prev => ({ ...prev, status: 'success' }))
        } else if (i === 2) {
          setElementaryUploadedFile3(prev => ({ ...prev, status: 'success' }))
        } else if (i === 3) {
          setElementaryUploadedFile4(prev => ({ ...prev, status: 'success' }))
        } else if (i === 4) {
          setElementaryUploadedFile5(prev => ({ ...prev, status: 'success' }))
        }
      }

      setElementarySuccess(`Successfully uploaded ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}! ${totalRowsInserted} rows inserted.`)

    } catch (err) {
      console.error('Elementary upload error:', err)
      setElementaryError(err.message || 'An error occurred during upload')
      if (elementaryUploadedFile1) setElementaryUploadedFile1(prev => ({ ...prev, status: 'error' }))
      if (elementaryUploadedFile2) setElementaryUploadedFile2(prev => ({ ...prev, status: 'error' }))
      if (elementaryUploadedFile3) setElementaryUploadedFile3(prev => ({ ...prev, status: 'error' }))
      if (elementaryUploadedFile4) setElementaryUploadedFile4(prev => ({ ...prev, status: 'error' }))
      if (elementaryUploadedFile5) setElementaryUploadedFile5(prev => ({ ...prev, status: 'error' }))
    } finally {
      setElementaryUploading(false)
    }
  }

  // Check for existing record when company or month changes (Elementary)
  useEffect(() => {
    const checkExistingRecord = async () => {
      if (!elementarySelectedCompanyId || !elementarySelectedMonth) {
        setElementaryExistingRecord(null)
        return
      }

      setElementaryCheckingRecord(true)
      try {
        const response = await fetch(`${API_ENDPOINTS.upload}/records?uploadType=elementary`)
        const result = await response.json()

        if (response.ok && result.success) {
          const existing = result.data.find(
            record => record.company_id === parseInt(elementarySelectedCompanyId) && record.month === elementarySelectedMonth
          )
          setElementaryExistingRecord(existing || null)
        }
      } catch (err) {
        console.error('Error checking existing record:', err)
      } finally {
        setElementaryCheckingRecord(false)
      }
    }

    checkExistingRecord()
  }, [elementarySelectedCompanyId, elementarySelectedMonth])

  // Clear elementary files when company changes
  useEffect(() => {
    if (elementaryUploadedFile1 || elementaryUploadedFile2 || elementaryUploadedFile3 || elementaryUploadedFile4 || elementaryUploadedFile5) {
      setElementaryUploadedFile1(null)
      setElementaryUploadedFile2(null)
      setElementaryUploadedFile3(null)
      setElementaryUploadedFile4(null)
      setElementaryUploadedFile5(null)
      setElementaryError(null)
      setElementarySuccess(null)
    }
  }, [elementarySelectedCompanyId])

  // Reset state when switching tabs
  useEffect(() => {
    // Clear Life Insurance tab state
    setUploadedFile1(null)
    setUploadedFile2(null)
    setUploadedFile3(null)
    setError(null)
    setSuccess(null)
    setSelectedCompanyId('')
    setSelectedMonth(() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    setExistingRecord(null)

    // Clear Elementary tab state
    setElementaryUploadedFile1(null)
    setElementaryUploadedFile2(null)
    setElementaryUploadedFile3(null)
    setElementaryError(null)
    setElementarySuccess(null)
    setElementarySelectedCompanyId('')
    setElementarySelectedMonth(() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    setElementaryExistingRecord(null)
  }, [activeTab])

  // Delete modal functions
  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      setDeleteError(null)

      // Fetch regular records filtered by current active tab (upload type)
      const response = await fetch(`${API_ENDPOINTS.upload}/records?uploadType=${activeTab}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch records')
      }

      setRecords(result.data || [])

      // If Elementary tab, also fetch Direct Agents records
      if (activeTab === 'elementary') {
        const directAgentsResponse = await fetch(`${API_ENDPOINTS.upload}/records?uploadType=direct-agents`)
        const directAgentsResult = await directAgentsResponse.json()

        if (directAgentsResponse.ok && directAgentsResult.success) {
          setDirectAgentsRecords(directAgentsResult.data || [])
        } else {
          setDirectAgentsRecords([])
        }
      }
    } catch (err) {
      console.error('Error fetching records:', err)
      setDeleteError(err.message || 'Failed to fetch records')
      setRecords([]) // Clear records on error
      setDirectAgentsRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }

  const openDeleteModal = () => {
    setDeleteModalOpen(true)
    setDeleteError(null)
    setDeleteSuccess(null)
    fetchRecords()
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteError(null)
    setDeleteSuccess(null)
    setDeleteCompanyFilter('')
    setDeleteMonthFilter(() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    setDeleteModalTab('regular') // Reset to regular tab
  }

  const openConfirmModal = (companyId, month) => {
    setRecordToDelete({ companyId, month })
    setConfirmModalOpen(true)
  }

  const closeConfirmModal = () => {
    setConfirmModalOpen(false)
    setRecordToDelete(null)
  }

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return

    const { companyId, month } = recordToDelete

    try {
      setDeleting(`${companyId || 'direct-agents'}-${month}`)
      setDeleteError(null)
      setDeleteSuccess(null)
      setConfirmModalOpen(false)

      // Determine uploadType based on deleteModalTab
      const uploadType = deleteModalTab === 'direct-agents' ? 'direct-agents' : activeTab

      const response = await fetch(`${API_ENDPOINTS.upload}/records`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          month: month,
          uploadType: uploadType
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete record')
      }

      // Different success message for Direct Agents vs regular records
      let successMsg = 'Successfully deleted record! '
      if (uploadType === 'direct-agents') {
        successMsg += `${result.summary?.aggregationsDeleted || 0} aggregation rows removed.`
      } else {
        successMsg += `${result.summary?.rawDataDeleted || 0} raw data rows and ${result.summary?.aggregationsDeleted || 0} aggregation rows removed.`
      }
      setDeleteSuccess(successMsg)

      // Refresh records list
      fetchRecords()

      // Clear success message after 3 seconds
      setTimeout(() => setDeleteSuccess(null), 3000)

    } catch (err) {
      console.error('Error deleting record:', err)
      setDeleteError(err.message || 'Failed to delete record')
    } finally {
      setDeleting(null)
      setRecordToDelete(null)
    }
  }

  // Filter records based on company and month filters
  const filteredRecords = records.filter(record => {
    const matchesCompany = !deleteCompanyFilter || deleteCompanyFilter === '' || record.company_id === parseInt(deleteCompanyFilter)
    const matchesMonth = !deleteMonthFilter || deleteMonthFilter === '' || record.month === deleteMonthFilter
    return matchesCompany && matchesMonth
  })

  // Filter Direct Agents records (only by month)
  const filteredDirectAgentsRecords = directAgentsRecords.filter(record => {
    const matchesMonth = !deleteMonthFilter || deleteMonthFilter === '' || record.month === deleteMonthFilter
    return matchesMonth
  })

  // Lock body scroll when delete modal is open
  useEffect(() => {
    if (deleteModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [deleteModalOpen])

  const selectedCompany = companies.find(c => c.id === parseInt(selectedCompanyId))
  const elementarySelectedCompany = companies.find(c => c.id === parseInt(elementarySelectedCompanyId))

  // Helper function to check if company requires 2 files
const getRequiredFilesCount = (companyIdParam, context = 'life-insurance') => {
  const companyId = parseInt(companyIdParam)
  if (companyId === 7) {
    // Clal needs 3 files for life insurance, 1 file for elementary
    return context === 'elementary' ? 1 : 3
  }
  if (companyId === 4) {
    // Hachshara needs 2 files for life insurance, 4 files for elementary
    return context === 'elementary' ? 4 : 2
  }
  if (companyId === 11 && context === 'life-insurance') return 2  // Menorah needs 2 files for life insurance
  return 1  // Default is 1 file
}

  // Helper function to get file labels
  const getFileLabel = (fileNumber, companyIdParam, context = 'life-insurance') => {
    const companyId = parseInt(companyIdParam)

    if (companyId === 4 && context === 'life-insurance') {
      return fileNumber === 1 ? 'הכשרה בסט' : 'הכשרה סיכונים'
    }

    if (companyId === 4 && context === 'elementary') {
      // Hachshara elementary file labels
      if (fileNumber === 1) return 'File 1'
      if (fileNumber === 2) return 'File 2'
      if (fileNumber === 3) return 'File 3'
      if (fileNumber === 4) return 'File 4'
      return `File ${fileNumber}`
    }

    if (companyId === 7) {
      return `Excel ${fileNumber}`  // For Clal: Excel 1, Excel 2, Excel 3
    }

    if (companyId === 11 && context === 'life-insurance') {
      return fileNumber === 1 ? 'קובץ ביטוח חיים רגיל' : 'קובץ ניודי פנסיה'
    }

    return `File ${fileNumber}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t('uploadExcelFiles')} - {' '}
              {activeTab === 'life-insurance' && (language === 'he' ? 'ביטוח חיים' : 'Life Insurance')}
              {activeTab === 'elementary' && (language === 'he' ? 'אלמנטרי' : 'Elementary')}
              {activeTab === 'commission' && (language === 'he' ? 'נציבות' : 'Commission')}
            </h2>
            <p className="text-gray-600">{t('uploadCompanyData')}</p>
          </div>
          <button
            onClick={openDeleteModal}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Trash2 className="w-5 h-5" />
            {t('viewDeleteUploadedFiles') || 'View & Delete Uploaded Files'}
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-semibold transition-all
                    ${activeTab === tab.id
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  {language === 'he' ? tab.labelHe : tab.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Life Insurance Tab Content */}
        {activeTab === 'life-insurance' && (
          <>
        {/* Existing Record Warning */}
        {existingRecord && (
          <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-orange-900 text-lg mb-1">
                {t('recordAlreadyExists')}
              </h4>
              <p className="text-orange-800 text-sm">
                {language === 'he' 
                  ? `קיים רשומה עבור ${existingRecord.company_name} לחודש ${new Date(existingRecord.month + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}. יש למחוק את הרשומה הקיימת לפני העלאת קובץ חדש.`
                  : `A record already exists for ${existingRecord.company_name_en} for ${new Date(existingRecord.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Please delete the existing record before uploading a new file.`
                }
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">{t('error')}</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">{t('success')}</h4>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* UPDATE THIS SECTION - Change grid-cols to md:grid-cols-2 and add month picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('step1SelectCompanyMonth')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Dropdown */}
            <div>
              <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('selectCompany')}
              </label>
            
<select
  id="company"
  value={selectedCompanyId}
  onChange={(e) => setSelectedCompanyId(e.target.value)}
  className="block w-full px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium shadow-sm"
  required
  disabled={loadingCompanies}
>
  <option value="">
    {loadingCompanies ? 'Loading companies...' : t('chooseCompany')}
  </option>
  {companies.filter(company => company.insurance).map((company) => (
    <option key={company.id} value={company.id}>
      {language === 'he' ? company.name : company.name_en}
    </option>
  ))}
</select>
            </div>

            {/* ADD MONTH PICKER */}
            <div>
              <label htmlFor="month" className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                {t('selectMonth')}
              </label>
              <input
                type="month"
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium shadow-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Clal Instructions */}
        {parseInt(selectedCompanyId) === 7 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                {language === 'he' 
                  ? 'ניתן להעלות את 3 הקבצים בכל סדר שתרצה - המערכת מזהה אוטומטית כל קובץ על פי שם הטאב שבפנים' 
                  : 'You can upload the 3 files in any order - the system auto-detects each file by its tab name'}
              </p>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
  {t('step2UploadExcel')}
</h3>

<div className={`grid ${getRequiredFilesCount(selectedCompanyId) === 3 ? 'md:grid-cols-3' : getRequiredFilesCount(selectedCompanyId) === 2 ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {/* First File Upload */}
            <div>
            {getRequiredFilesCount(selectedCompanyId) > 1 && (
  <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(1, selectedCompanyId)}</h4>
)}
              <form
                onDragEnter={(e) => handleDrag(e, 1)}
                onDragLeave={(e) => handleDrag(e, 1)}
                onDragOver={(e) => handleDrag(e, 1)}
                onDrop={(e) => handleDrop(e, 1)}
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  id="file-upload-1"
                  accept=".xlsx,.xlsb,.xls"
                  onChange={(e) => handleChange(e, 1)}
                  className="hidden"
                />

                <label
                  htmlFor="file-upload-1"
                  className={`
                    flex flex-col items-center justify-center
                    border-3 border-dashed rounded-2xl p-8 cursor-pointer
                    transition-all duration-200
                    ${dragActive1
                      ? 'border-brand-primary bg-blue-50'
                      : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center mb-3
                    ${dragActive1 ? 'bg-brand-primary' : 'bg-blue-100'}
                  `}>
                    <UploadIcon className={`w-8 h-8 ${dragActive1 ? 'text-white' : 'text-brand-primary'}`} />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {dragActive1 ? t('dropFileHere') : t('uploadExcelFile')}
                  </h3>

                  <p className="text-gray-600 text-sm text-center">
                    {t('dragAndDropBrowse')}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{t('excelSupported')}</span>
                  </div>
                </label>
              </form>
            </div>

            {/* Second File Upload (for companies requiring 2+ files) */}
{getRequiredFilesCount(selectedCompanyId) >= 2 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(2, selectedCompanyId)}</h4>
                <form
                  onDragEnter={(e) => handleDrag(e, 2)}
                  onDragLeave={(e) => handleDrag(e, 2)}
                  onDragOver={(e) => handleDrag(e, 2)}
                  onDrop={(e) => handleDrop(e, 2)}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    id="file-upload-2"
                    accept=".xlsx,.xlsb,.xls"
                    onChange={(e) => handleChange(e, 2)}
                    className="hidden"
                  />

                  <label
                    htmlFor="file-upload-2"
                    className={`
                      flex flex-col items-center justify-center
                      border-3 border-dashed rounded-2xl p-8 cursor-pointer
                      transition-all duration-200
                      ${dragActive2
                        ? 'border-brand-primary bg-blue-50'
                        : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center mb-3
                      ${dragActive2 ? 'bg-brand-primary' : 'bg-blue-100'}
                    `}>
                      <UploadIcon className={`w-8 h-8 ${dragActive2 ? 'text-white' : 'text-brand-primary'}`} />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {dragActive2 ? t('dropFileHere') : t('uploadExcelFile')}
                    </h3>

                    <p className="text-gray-600 text-sm text-center">
                      {t('dragAndDropBrowse')}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{t('excelSupported')}</span>
                    </div>
                  </label>
                </form>
              </div>
            )}
            {/* Third File Upload (only for Clal - company 7) */}
            {getRequiredFilesCount(selectedCompanyId) === 3 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(3, selectedCompanyId)}</h4>
                <form
                  onDragEnter={(e) => handleDrag(e, 3)}
                  onDragLeave={(e) => handleDrag(e, 3)}
                  onDragOver={(e) => handleDrag(e, 3)}
                  onDrop={(e) => handleDrop(e, 3)}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    id="file-upload-3"
                    accept=".xlsx,.xlsb,.xls"
                    onChange={(e) => handleChange(e, 3)}
                    className="hidden"
                  />

                  <label
                    htmlFor="file-upload-3"
                    className={`
                      flex flex-col items-center justify-center
                      border-3 border-dashed rounded-2xl p-8 cursor-pointer
                      transition-all duration-200
                      ${dragActive3
                        ? 'border-brand-primary bg-blue-50'
                        : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center mb-3
                      ${dragActive3 ? 'bg-brand-primary' : 'bg-blue-100'}
                    `}>
                      <UploadIcon className={`w-8 h-8 ${dragActive3 ? 'text-white' : 'text-brand-primary'}`} />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {dragActive3 ? t('dropFileHere') : t('uploadExcelFile')}
                    </h3>

                    <p className="text-gray-600 text-sm text-center">
                      {t('dragAndDropBrowse')}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{t('excelSupported')}</span>
                    </div>
                  </label>
                </form>
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-3 text-brand-primary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                <span className="font-semibold">{t('uploadingProcessing')}</span>
              </div>
            </div>
          )}
        </div>

        {(uploadedFile1 || uploadedFile2 || uploadedFile3) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {t('uploadedFile')}
                {getRequiredFilesCount(selectedCompanyId) > 1 && ` (${(uploadedFile1 ? 1 : 0) + (uploadedFile2 ? 1 : 0) + (uploadedFile3 ? 1 : 0)}/${getRequiredFilesCount(selectedCompanyId)})`}
              </h3>
            </div>

            <div className="space-y-3">
              {uploadedFile1 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      uploadedFile1.status === 'success' ? 'bg-green-100' :
                      uploadedFile1.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <File className={`w-6 h-6 ${
                        uploadedFile1.status === 'success' ? 'text-green-600' :
                        uploadedFile1.status === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {getRequiredFilesCount(selectedCompanyId) > 1 && <span className="text-gray-500 text-sm mr-2">{getFileLabel(1, selectedCompanyId)}:</span>}
                        {uploadedFile1.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{uploadedFile1.size}</span>
                        {uploadedFile1.status === 'success' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('uploadedSuccessfully')}
                            </span>
                          </>
                        )}
                        {uploadedFile1.status === 'error' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-red-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {t('uploadFailed')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(1)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {uploadedFile2 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      uploadedFile2.status === 'success' ? 'bg-green-100' :
                      uploadedFile2.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <File className={`w-6 h-6 ${
                        uploadedFile2.status === 'success' ? 'text-green-600' :
                        uploadedFile2.status === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        <span className="text-gray-500 text-sm mr-2">{getFileLabel(2, selectedCompanyId)}:</span>
                        {uploadedFile2.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{uploadedFile2.size}</span>
                        {uploadedFile2.status === 'success' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('uploadedSuccessfully')}
                            </span>
                          </>
                        )}
                        {uploadedFile2.status === 'error' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-red-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {t('uploadFailed')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(2)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

{uploadedFile3 && (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
    <div className="flex items-center flex-1">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
        uploadedFile3.status === 'success' ? 'bg-green-100' :
        uploadedFile3.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        <File className={`w-6 h-6 ${
          uploadedFile3.status === 'success' ? 'text-green-600' :
          uploadedFile3.status === 'error' ? 'text-red-600' : 'text-blue-600'
        }`} />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">
          <span className="text-gray-500 text-sm mr-2">{getFileLabel(3, selectedCompanyId)}:</span>
          {uploadedFile3.name}
        </h4>
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
          <span>{uploadedFile3.size}</span>
          {uploadedFile3.status === 'success' && (
            <>
              <span>•</span>
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('uploadedSuccessfully')}
              </span>
            </>
          )}
          {uploadedFile3.status === 'error' && (
            <>
              <span>•</span>
              <span className="flex items-center text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {t('uploadFailed')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
    <button
      onClick={() => removeFile(3)}
      className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)}
            </div>
          </div>
        )}



        <div className="mt-8">
        <button
  onClick={handleSubmit}
  disabled={
    !selectedCompanyId ||
    !uploadedFile1 ||
    uploading ||
    existingRecord
  }
  className={`
    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3
    ${
      selectedCompanyId &&
      uploadedFile1 &&
      !uploading &&
      !existingRecord
        ? 'bg-brand-primary text-white hover:bg-primary-600 hover:shadow-xl transform hover:scale-[1.02]'
        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
    }
  `}
>
  <CheckCircle className="w-6 h-6" />
  {uploading ? t('processing') : `${t('submitDataFor')} ${selectedCompany ? (language === 'he' ? selectedCompany.name : selectedCompany.name_en) : t('selectedCompany')}`}
</button>

          <p className="text-center text-sm text-gray-500 mt-3">
            {!selectedCompanyId && t('pleaseSelectCompany')}
            {selectedCompanyId && !uploadedFile1 && (
  getRequiredFilesCount(selectedCompanyId) > 1
    ? `Please upload at least 1 Excel file (additional files are optional)`
    : t('pleaseUploadExcelFile')
)}
{selectedCompanyId && uploadedFile1 && !uploading && `${t('readyToSubmit')} ${new Date(selectedMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>
          </>
        )}

        {/* Elementary Tab Content */}
        {activeTab === 'elementary' && (
          <>
        {/* Existing Record Warning */}
        {elementaryExistingRecord && (
          <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-orange-900 text-lg mb-1">
                {t('recordAlreadyExists')}
              </h4>
              <p className="text-orange-800 text-sm">
                {language === 'he' 
                  ? `קיים רשומה עבור ${elementaryExistingRecord.company_name} לחודש ${new Date(elementaryExistingRecord.month + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}. יש למחוק את הרשומה הקיימת לפני העלאת קובץ חדש.`
                  : `A record already exists for ${elementaryExistingRecord.company_name_en} for ${new Date(elementaryExistingRecord.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Please delete the existing record before uploading a new file.`
                }
              </p>
            </div>
          </div>
        )}

        {elementaryError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">{t('error')}</h4>
              <p className="text-red-700 text-sm">{elementaryError}</p>
            </div>
            <button onClick={() => setElementaryError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {elementarySuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">{t('success')}</h4>
              <p className="text-green-700 text-sm">{elementarySuccess}</p>
            </div>
            <button onClick={() => setElementarySuccess(null)} className="text-green-400 hover:text-green-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">{t('step1SelectCompanyMonth')}</h3>
            <button
              onClick={() => setDirectAgentsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>{t('directAgents')}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="elementary-company" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('selectCompany')}
              </label>
<select
  id="elementary-company"
  value={elementarySelectedCompanyId}
  onChange={(e) => setElementarySelectedCompanyId(e.target.value)}
  className="block w-full px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium shadow-sm"
  required
  disabled={loadingCompanies}
>
  <option value="">
    {loadingCompanies ? 'Loading companies...' : t('chooseCompany')}
  </option>
  {companies.filter(company => company.elementary).map((company) => (
    <option key={company.id} value={company.id}>
      {language === 'he' ? company.name : company.name_en}
    </option>
  ))}
</select>
            </div>
            <div>
              <label htmlFor="elementary-month" className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                {t('selectMonth')}
              </label>
              <input
                type="month"
                id="elementary-month"
                value={elementarySelectedMonth}
                onChange={(e) => setElementarySelectedMonth(e.target.value)}
                className="block w-full px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium shadow-sm"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
  {t('step2UploadExcel')}
</h3>
<div className={`grid ${getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') === 3 ? 'md:grid-cols-3' : getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') === 2 ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            <div>
            {getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') > 1 && (
  <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(1, elementarySelectedCompanyId, 'elementary')}</h4>
)}
              <form
                onDragEnter={(e) => handleElementaryDrag(e, 1)}
                onDragLeave={(e) => handleElementaryDrag(e, 1)}
                onDragOver={(e) => handleElementaryDrag(e, 1)}
                onDrop={(e) => handleElementaryDrop(e, 1)}
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  id="elementary-file-upload-1"
                  accept=".xlsx,.xlsb,.xls"
                  onChange={(e) => handleElementaryChange(e, 1)}
                  className="hidden"
                />
                <label
                  htmlFor="elementary-file-upload-1"
                  className={`
                    flex flex-col items-center justify-center
                    border-3 border-dashed rounded-2xl p-8 cursor-pointer
                    transition-all duration-200
                    ${elementaryDragActive1
                      ? 'border-brand-primary bg-blue-50'
                      : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center mb-3
                    ${elementaryDragActive1 ? 'bg-brand-primary' : 'bg-blue-100'}
                  `}>
                    <UploadIcon className={`w-8 h-8 ${elementaryDragActive1 ? 'text-white' : 'text-brand-primary'}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {elementaryDragActive1 ? t('dropFileHere') : t('uploadExcelFile')}
                  </h3>
                  <p className="text-gray-600 text-sm text-center">
                    {t('dragAndDropBrowse')}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{t('excelSupported')}</span>
                  </div>
                </label>
              </form>
            </div>
{getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') >= 2 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(2, elementarySelectedCompanyId, 'elementary')}</h4>
                <form
                  onDragEnter={(e) => handleElementaryDrag(e, 2)}
                  onDragLeave={(e) => handleElementaryDrag(e, 2)}
                  onDragOver={(e) => handleElementaryDrag(e, 2)}
                  onDrop={(e) => handleElementaryDrop(e, 2)}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    id="elementary-file-upload-2"
                    accept=".xlsx,.xlsb,.xls"
                    onChange={(e) => handleElementaryChange(e, 2)}
                    className="hidden"
                  />
                  <label
                    htmlFor="elementary-file-upload-2"
                    className={`
                      flex flex-col items-center justify-center
                      border-3 border-dashed rounded-2xl p-8 cursor-pointer
                      transition-all duration-200
                      ${elementaryDragActive2
                        ? 'border-brand-primary bg-blue-50'
                        : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center mb-3
                      ${elementaryDragActive2 ? 'bg-brand-primary' : 'bg-blue-100'}
                    `}>
                      <UploadIcon className={`w-8 h-8 ${elementaryDragActive2 ? 'text-white' : 'text-brand-primary'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {elementaryDragActive2 ? t('dropFileHere') : t('uploadExcelFile')}
                    </h3>
                    <p className="text-gray-600 text-sm text-center">
                      {t('dragAndDropBrowse')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{t('excelSupported')}</span>
                    </div>
                  </label>
                </form>
              </div>
            )}
            {getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') >= 3 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(3, elementarySelectedCompanyId, 'elementary')}</h4>
                <form
                  onDragEnter={(e) => handleElementaryDrag(e, 3)}
                  onDragLeave={(e) => handleElementaryDrag(e, 3)}
                  onDragOver={(e) => handleElementaryDrag(e, 3)}
                  onDrop={(e) => handleElementaryDrop(e, 3)}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    id="elementary-file-upload-3"
                    accept=".xlsx,.xlsb,.xls"
                    onChange={(e) => handleElementaryChange(e, 3)}
                    className="hidden"
                  />
                  <label
                    htmlFor="elementary-file-upload-3"
                    className={`
                      flex flex-col items-center justify-center
                      border-3 border-dashed rounded-2xl p-8 cursor-pointer
                      transition-all duration-200
                      ${elementaryDragActive3
                        ? 'border-brand-primary bg-blue-50'
                        : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center mb-3
                      ${elementaryDragActive3 ? 'bg-brand-primary' : 'bg-blue-100'}
                    `}>
                      <UploadIcon className={`w-8 h-8 ${elementaryDragActive3 ? 'text-white' : 'text-brand-primary'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {elementaryDragActive3 ? t('dropFileHere') : t('uploadExcelFile')}
                    </h3>
                    <p className="text-gray-600 text-sm text-center">
                      {t('dragAndDropBrowse')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{t('excelSupported')}</span>
                    </div>
                  </label>
                </form>
              </div>
            )}
            {getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') >= 4 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(4, elementarySelectedCompanyId, 'elementary')}</h4>
                <form
                  onDragEnter={(e) => handleElementaryDrag(e, 4)}
                  onDragLeave={(e) => handleElementaryDrag(e, 4)}
                  onDragOver={(e) => handleElementaryDrag(e, 4)}
                  onDrop={(e) => handleElementaryDrop(e, 4)}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    id="elementary-file-upload-4"
                    accept=".xlsx,.xlsb,.xls"
                    onChange={(e) => handleElementaryChange(e, 4)}
                    className="hidden"
                  />
                  <label
                    htmlFor="elementary-file-upload-4"
                    className={`
                      flex flex-col items-center justify-center
                      border-3 border-dashed rounded-2xl p-8 cursor-pointer
                      transition-all duration-200
                      ${elementaryDragActive4
                        ? 'border-brand-primary bg-blue-50'
                        : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center mb-3
                      ${elementaryDragActive4 ? 'bg-brand-primary' : 'bg-blue-100'}
                    `}>
                      <UploadIcon className={`w-8 h-8 ${elementaryDragActive4 ? 'text-white' : 'text-brand-primary'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {elementaryDragActive4 ? t('dropFileHere') : t('uploadExcelFile')}
                    </h3>
                    <p className="text-gray-600 text-sm text-center">
                      {t('dragAndDropBrowse')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{t('excelSupported')}</span>
                    </div>
                  </label>
                </form>
              </div>
            )}
          </div>
          {elementaryUploading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-3 text-brand-primary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                <span className="font-semibold">{t('uploadingProcessing')}</span>
              </div>
            </div>
          )}
        </div>
        {(elementaryUploadedFile1 || elementaryUploadedFile2 || elementaryUploadedFile3 || elementaryUploadedFile4 || elementaryUploadedFile5) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {t('uploadedFile')}
                {getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') > 1 && ` (${(elementaryUploadedFile1 ? 1 : 0) + (elementaryUploadedFile2 ? 1 : 0) + (elementaryUploadedFile3 ? 1 : 0) + (elementaryUploadedFile4 ? 1 : 0) + (elementaryUploadedFile5 ? 1 : 0)}/${getRequiredFilesCount(elementarySelectedCompanyId, 'elementary')})`}
              </h3>
            </div>
            <div className="space-y-3">
              {elementaryUploadedFile1 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      elementaryUploadedFile1.status === 'success' ? 'bg-green-100' :
                      elementaryUploadedFile1.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <File className={`w-6 h-6 ${
                        elementaryUploadedFile1.status === 'success' ? 'text-green-600' :
                        elementaryUploadedFile1.status === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') > 1 && <span className="text-gray-500 text-sm mr-2">{getFileLabel(1, elementarySelectedCompanyId, 'elementary')}:</span>}
                        {elementaryUploadedFile1.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{elementaryUploadedFile1.size}</span>
                        {elementaryUploadedFile1.status === 'success' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('uploadedSuccessfully')}
                            </span>
                          </>
                        )}
                        {elementaryUploadedFile1.status === 'error' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-red-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {t('uploadFailed')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeElementaryFile(1)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              {elementaryUploadedFile2 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      elementaryUploadedFile2.status === 'success' ? 'bg-green-100' :
                      elementaryUploadedFile2.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <File className={`w-6 h-6 ${
                        elementaryUploadedFile2.status === 'success' ? 'text-green-600' :
                        elementaryUploadedFile2.status === 'error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        <span className="text-gray-500 text-sm mr-2">{getFileLabel(2, elementarySelectedCompanyId, 'elementary')}:</span>
                        {elementaryUploadedFile2.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{elementaryUploadedFile2.size}</span>
                        {elementaryUploadedFile2.status === 'success' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('uploadedSuccessfully')}
                            </span>
                          </>
                        )}
                        {elementaryUploadedFile2.status === 'error' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-red-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {t('uploadFailed')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeElementaryFile(2)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
{elementaryUploadedFile3 && (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
    <div className="flex items-center flex-1">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
        elementaryUploadedFile3.status === 'success' ? 'bg-green-100' :
        elementaryUploadedFile3.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        <File className={`w-6 h-6 ${
          elementaryUploadedFile3.status === 'success' ? 'text-green-600' :
          elementaryUploadedFile3.status === 'error' ? 'text-red-600' : 'text-blue-600'
        }`} />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">
          <span className="text-gray-500 text-sm mr-2">{getFileLabel(3, elementarySelectedCompanyId, 'elementary')}:</span>
          {elementaryUploadedFile3.name}
        </h4>
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
          <span>{elementaryUploadedFile3.size}</span>
          {elementaryUploadedFile3.status === 'success' && (
            <>
              <span>•</span>
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('uploadedSuccessfully')}
              </span>
            </>
          )}
          {elementaryUploadedFile3.status === 'error' && (
            <>
              <span>•</span>
              <span className="flex items-center text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {t('uploadFailed')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
    <button
      onClick={() => removeElementaryFile(3)}
      className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)}
{elementaryUploadedFile4 && (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
    <div className="flex items-center flex-1">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
        elementaryUploadedFile4.status === 'success' ? 'bg-green-100' :
        elementaryUploadedFile4.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        <File className={`w-6 h-6 ${
          elementaryUploadedFile4.status === 'success' ? 'text-green-600' :
          elementaryUploadedFile4.status === 'error' ? 'text-red-600' : 'text-blue-600'
        }`} />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">
          <span className="text-gray-500 text-sm mr-2">{getFileLabel(4, elementarySelectedCompanyId, 'elementary')}:</span>
          {elementaryUploadedFile4.name}
        </h4>
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
          <span>{elementaryUploadedFile4.size}</span>
          {elementaryUploadedFile4.status === 'success' && (
            <>
              <span>•</span>
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('uploadedSuccessfully')}
              </span>
            </>
          )}
          {elementaryUploadedFile4.status === 'error' && (
            <>
              <span>•</span>
              <span className="flex items-center text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {t('uploadFailed')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
    <button
      onClick={() => removeElementaryFile(4)}
      className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)}
            </div>
          </div>
        )}
        <div className="mt-8">
        <button
  onClick={handleElementarySubmit}
  disabled={
    !elementarySelectedCompanyId ||
    !elementaryUploadedFile1 ||
    elementaryUploading ||
    elementaryExistingRecord
  }
  className={`
    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3
    ${
      elementarySelectedCompanyId &&
      elementaryUploadedFile1 &&
      !elementaryUploading &&
      !elementaryExistingRecord
        ? 'bg-brand-primary text-white hover:bg-primary-600 hover:shadow-xl transform hover:scale-[1.02]'
        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
    }
  `}
>
  <CheckCircle className="w-6 h-6" />
  {elementaryUploading ? t('processing') : `${t('submitDataFor')} ${elementarySelectedCompany ? (language === 'he' ? elementarySelectedCompany.name : elementarySelectedCompany.name_en) : t('selectedCompany')}`}
</button>
          <p className="text-center text-sm text-gray-500 mt-3">
            {!elementarySelectedCompanyId && t('pleaseSelectCompany')}
            {elementarySelectedCompanyId && !elementaryUploadedFile1 && (
  getRequiredFilesCount(elementarySelectedCompanyId, 'elementary') > 1
    ? `Please upload at least 1 Excel file (additional files are optional)`
    : t('pleaseUploadExcelFile')
)}
{elementarySelectedCompanyId && elementaryUploadedFile1 && !elementaryUploading && `${t('readyToSubmit')} ${new Date(elementarySelectedMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>
          </>
        )}

        {/* Commission Tab Content */}
        {activeTab === 'commission' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'he' ? 'נציבות' : 'Commission'}
              </h3>
              <p className="text-gray-600">
                {language === 'he' ? 'תוכן בקרוב' : 'Content coming soon'}
              </p>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
              onClick={closeDeleteModal}
            />

            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-fadeIn">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Trash2 className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {t('viewDeleteUploadedFiles') || 'View & Delete Uploaded Files'} - {' '}
                          {activeTab === 'life-insurance' && (language === 'he' ? 'ביטוח חיים' : 'Life Insurance')}
                          {activeTab === 'elementary' && (language === 'he' ? 'אלמנטרי' : 'Elementary')}
                          {activeTab === 'commission' && (language === 'he' ? 'נציבות' : 'Commission')}
                        </h3>
                        <p className="text-sm text-gray-600">{t('selectFileToDelete') || 'Select an uploaded file to delete from the system'}</p>
                      </div>
                    </div>
                    <button
                      onClick={closeDeleteModal}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {deleteError && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-red-800 text-sm">{deleteError}</span>
                      </div>
                    )}

                    {deleteSuccess && (
                      <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-green-800 text-sm">{deleteSuccess}</span>
                      </div>
                    )}

                    {/* Tabs for Elementary */}
                    {activeTab === 'elementary' && (
                      <div className="flex gap-2 mb-6 border-b border-gray-200">
                        <button
                          onClick={() => setDeleteModalTab('regular')}
                          className={`px-6 py-3 font-semibold transition-all ${
                            deleteModalTab === 'regular'
                              ? 'text-brand-primary border-b-2 border-brand-primary'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {t('regularElementary')}
                        </button>
                        <button
                          onClick={() => setDeleteModalTab('direct-agents')}
                          className={`px-6 py-3 font-semibold transition-all ${
                            deleteModalTab === 'direct-agents'
                              ? 'text-brand-primary border-b-2 border-brand-primary'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {t('directAgentsTab')}
                        </button>
                      </div>
                    )}

                    {/* Filters */}
                    <div className={`grid ${deleteModalTab === 'direct-agents' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 mb-6`}>
                      {/* Company filter - only show for regular tab or non-elementary */}
                      {(activeTab !== 'elementary' || deleteModalTab === 'regular') && (
                        <div>
                          <label htmlFor="delete-company-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                            <Building2 className="w-4 h-4 inline mr-2" />
                            {t('filterByCompany') || 'Filter by Company'}
                          </label>
                          <select
                            id="delete-company-filter"
                            value={deleteCompanyFilter}
                            onChange={(e) => setDeleteCompanyFilter(e.target.value)}
                            className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                            disabled={loadingRecords}
                          >
                            <option value="">{t('allCompanies') || 'All Companies'}</option>
                            {!loadingRecords && Array.from(new Set(records.map(r => r.company_id)))
                              .sort((a, b) => {
                                const recordA = records.find(r => r.company_id === a)
                                const recordB = records.find(r => r.company_id === b)
                                const nameA = language === 'he' ? recordA?.company_name : recordA?.company_name_en
                                const nameB = language === 'he' ? recordB?.company_name : recordB?.company_name_en
                                return (nameA || '').localeCompare(nameB || '')
                              })
                              .map((companyId) => {
                                const record = records.find(r => r.company_id === companyId)
                                const companyName = language === 'he' ? record?.company_name : record?.company_name_en
                                return (
                                  <option key={companyId} value={companyId}>
                                    {companyName}
                                  </option>
                                )
                              })}
                          </select>
                        </div>
                      )}

                      <div>
                        <label htmlFor="delete-month-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          {t('filterByMonth') || 'Filter by Month'}
                        </label>
                        <input
                          type="month"
                          id="delete-month-filter"
                          value={deleteMonthFilter}
                          onChange={(e) => setDeleteMonthFilter(e.target.value)}
                          className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                        />
                      </div>
                    </div>

                    {/* Records Grid */}
                    {loadingRecords ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader className="w-8 h-8 text-brand-primary animate-spin" />
                        <span className="ml-3 text-gray-600 font-medium">{t('loading') || 'Loading...'}</span>
                      </div>
                    ) : deleteModalTab === 'direct-agents' ? (
                      // Direct Agents Records Grid
                      filteredDirectAgentsRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <File className="w-16 h-16 text-gray-300 mb-4" />
                          <p className="text-gray-600 font-medium">{t('noFilesFound') || 'No uploaded files found'}</p>
                          <p className="text-gray-500 text-sm">{t('tryDifferentFilters') || 'Try adjusting the filters'}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredDirectAgentsRecords.map((record) => {
                            const isDeleting = deleting === `direct-agents-${record.month}`
                            const [year, month] = record.month.split('-')

                            return (
                              <div
                                key={record.month}
                                className="relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-4 hover:shadow-lg transition-all"
                              >
                                <button
                                  onClick={() => openConfirmModal(null, record.month)}
                                  disabled={isDeleting}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('delete') || 'Delete'}
                                >
                                  {isDeleting ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </button>

                                <div className="flex items-center mb-3">
                                  <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-700" />
                                  </div>
                                  <div className="flex-1 pr-8">
                                    <h4 className="font-semibold text-gray-900 text-sm">
                                      {t('directAgents')} - {year}-{month}
                                    </h4>
                                  </div>
                                </div>

                                <div className="text-xs text-gray-600">
                                  <p className="mb-1">
                                    <span className="font-semibold">{t('month') || 'Month'}:</span> {new Date(record.month + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}
                                  </p>
                                  <p className="mb-1">
                                    <span className="font-semibold">{t('rows') || 'Rows'}:</span> {record.row_count}
                                  </p>
                                  <p>
                                    <span className="font-semibold">{t('companiesAffected')}:</span> {record.companies_count}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    <span className="font-semibold">{t('uploadedOn')}:</span> {new Date(record.uploaded_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    ) : (
                      // Regular Records Grid
                      filteredRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <File className="w-16 h-16 text-gray-300 mb-4" />
                          <p className="text-gray-600 font-medium">{t('noFilesFound') || 'No uploaded files found'}</p>
                          <p className="text-gray-500 text-sm">{t('tryDifferentFilters') || 'Try adjusting the filters'}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredRecords.map((record) => {
                            const isDeleting = deleting === `${record.company_id}-${record.month}`
                            const companyName = language === 'he' ? record.company_name : record.company_name_en
                            const [year, month] = record.month.split('-')
                            const displayName = `${companyName}-${year}-${month}`

                            return (
                              <div
                                key={`${record.company_id}-${record.month}`}
                                className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-4 hover:shadow-lg transition-all"
                              >
                                <button
                                  onClick={() => openConfirmModal(record.company_id, record.month)}
                                  disabled={isDeleting}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('delete') || 'Delete'}
                                >
                                  {isDeleting ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </button>

                                <div className="flex items-center mb-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                    <File className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 pr-8">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                                      {displayName}
                                    </h4>
                                  </div>
                                </div>

                                <div className="text-xs text-gray-600">
                                  <p className="mb-1">
                                    <span className="font-semibold">{t('company') || 'Company'}:</span> {companyName}
                                  </p>
                                  <p className="mb-1">
                                    <span className="font-semibold">{t('month') || 'Month'}:</span> {new Date(record.month + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}
                                  </p>
                                  <p>
                                    <span className="font-semibold">{t('rows') || 'Rows'}:</span> {record.row_count}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex gap-3 p-6 border-t border-gray-200">
                    <button
                      onClick={closeDeleteModal}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      {t('close') || 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Direct Agents Modal */}
        {directAgentsModalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-fadeIn"
              onClick={() => setDirectAgentsModalOpen(false)}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{t('directAgentsModalTitle')}</h2>
                        <p className="text-blue-100 text-sm mt-1">{t('directAgentsModalDescription')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDirectAgentsModalOpen(false)}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  {/* Error Message */}
                  {directAgentsError && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900">{t('error')}</h4>
                        <p className="text-red-700 text-sm">{directAgentsError}</p>
                      </div>
                      <button onClick={() => setDirectAgentsError(null)} className="text-red-400 hover:text-red-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Success Message */}
                  {directAgentsSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900">{t('success')}</h4>
                        <p className="text-green-700 text-sm">{directAgentsSuccess}</p>
                      </div>
                      <button onClick={() => setDirectAgentsSuccess(null)} className="text-green-400 hover:text-green-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Month Selection */}
                  <div className="mb-6">
                    <label htmlFor="direct-agents-month" className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {t('selectMonth')}
                    </label>
                    <input
                      type="month"
                      id="direct-agents-month"
                      value={directAgentsMonth}
                      onChange={(e) => setDirectAgentsMonth(e.target.value)}
                      className="block w-full px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium shadow-sm"
                      required
                    />
                  </div>

                  {/* File Upload Area */}
                  <div className="space-y-4">
                    <form
                      onDragEnter={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDirectAgentsDragActive(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDirectAgentsDragActive(false)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDirectAgentsDragActive(true)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDirectAgentsDragActive(false)

                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const file = e.dataTransfer.files[0]
                          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsb')) {
                            setDirectAgentsFile({
                              file: file,
                              name: file.name,
                              size: (file.size / 1024).toFixed(2) + ' KB'
                            })
                            setDirectAgentsError(null)
                          } else {
                            setDirectAgentsError('Please upload only Excel files (.xlsx or .xlsb)')
                          }
                        }
                      }}
                      onSubmit={(e) => e.preventDefault()}
                    >
                      <input
                        type="file"
                        id="direct-agents-file-upload"
                        accept=".xlsx,.xlsb"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0]
                            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsb')) {
                              setDirectAgentsFile({
                                file: file,
                                name: file.name,
                                size: (file.size / 1024).toFixed(2) + ' KB'
                              })
                              setDirectAgentsError(null)
                            } else {
                              setDirectAgentsError('Please upload only Excel files (.xlsx or .xlsb)')
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="direct-agents-file-upload"
                        className={`
                          flex flex-col items-center justify-center
                          border-3 border-dashed rounded-2xl p-12 cursor-pointer
                          transition-all duration-200
                          ${directAgentsDragActive
                            ? 'border-blue-600 bg-blue-50 scale-105'
                            : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`
                          w-20 h-20 rounded-full flex items-center justify-center mb-4
                          ${directAgentsDragActive ? 'bg-blue-600' : 'bg-blue-100'}
                        `}>
                          <UploadIcon className={`w-10 h-10 ${directAgentsDragActive ? 'text-white' : 'text-blue-600'}`} />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {directAgentsDragActive ? t('dropFileHere') : t('selectExcelFile')}
                        </h3>
                        <p className="text-gray-600 text-center mb-4">
                          {t('dragDropExcel')}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>{t('supportedFormats')}</span>
                        </div>
                      </label>
                    </form>

                    {/* Selected File Display */}
                    {directAgentsFile && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{directAgentsFile.name}</p>
                            <p className="text-sm text-gray-600">{directAgentsFile.size}</p>
                          </div>
                          <button
                            onClick={() => {
                              setDirectAgentsFile(null)
                              setDirectAgentsError(null)
                              setDirectAgentsSuccess(null)
                            }}
                            className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 rounded-b-2xl">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setDirectAgentsModalOpen(false)
                        setDirectAgentsFile(null)
                        setDirectAgentsError(null)
                        setDirectAgentsSuccess(null)
                      }}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                      disabled={directAgentsUploading}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={async () => {
                        if (!directAgentsFile) {
                          setDirectAgentsError('Please select a file first')
                          return
                        }

                        if (!directAgentsMonth) {
                          setDirectAgentsError('Please select a month')
                          return
                        }

                        setDirectAgentsUploading(true)
                        setDirectAgentsError(null)
                        setDirectAgentsSuccess(null)

                        try {
                          const formData = new FormData()
                          formData.append('file', directAgentsFile.file)
                          formData.append('month', directAgentsMonth)

                          const response = await fetch(`${API_ENDPOINTS.upload}/upload-direct-agents`, {
                            method: 'POST',
                            body: formData
                          })

                          const result = await response.json()

                          if (response.ok && result.success) {
                            let successMsg = result.message || 'File uploaded successfully!'

                            // Add warning summary if present
                            if (result.warnings && result.warnings.length > 0) {
                              successMsg += ` (${result.warnings.length} rows skipped - check console for details)`
                              console.warn('Skipped rows:', result.warnings)
                            }

                            setDirectAgentsSuccess(successMsg)
                            setDirectAgentsFile(null)

                            // Close modal after 3 seconds
                            setTimeout(() => {
                              setDirectAgentsModalOpen(false)
                              setDirectAgentsSuccess(null)
                            }, 3000)
                          } else {
                            setDirectAgentsError(result.error || 'Failed to upload file')
                          }
                        } catch (err) {
                          console.error('Direct Agents upload error:', err)
                          setDirectAgentsError(err.message || 'An error occurred during upload')
                        } finally {
                          setDirectAgentsUploading(false)
                        }
                      }}
                      disabled={!directAgentsFile || directAgentsUploading}
                      className={`
                        flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                        flex items-center justify-center gap-2
                        ${!directAgentsFile || directAgentsUploading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                        }
                      `}
                    >
                      {directAgentsUploading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>{t('uploadingProcessing')}</span>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-5 h-5" />
                          <span>{t('uploadFile')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Confirmation Modal */}
        {confirmModalOpen && recordToDelete && (() => {
          const record = records.find(r => r.company_id === recordToDelete.companyId && r.month === recordToDelete.month)
          const companyName = record ? (language === 'he' ? record.company_name : record.company_name_en) : ''
          const monthDisplay = recordToDelete.month ? new Date(recordToDelete.month + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' }) : ''

          return (
            <>
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity animate-fadeIn"
                onClick={closeConfirmModal}
              />

              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideUp">
                  <div className="p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                      {t('confirmDelete') || 'Confirm Deletion'}
                    </h3>

                    <p className="text-gray-600 text-center mb-6">
                      {t('confirmDeleteMessage') || 'Are you sure you want to delete this record? This action cannot be undone.'}
                    </p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border-2 border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <File className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 mb-2">
                            {companyName}
                          </p>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-medium">{t('month') || 'Month'}:</span> {monthDisplay}
                            </p>
                            {record && (
                              <p>
                                <span className="font-medium">{t('rows') || 'Rows'}:</span> {record.row_count}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={closeConfirmModal}
                        className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={handleDeleteRecord}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
                      >
                        {t('delete') || 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        })()}
      </main>
    </div>
  )
}

export default Upload