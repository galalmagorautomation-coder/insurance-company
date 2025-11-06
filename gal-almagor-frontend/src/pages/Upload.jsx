import { useState, useEffect } from 'react'
import { Upload as UploadIcon, File, X, CheckCircle, Building2, Calendar, AlertCircle, Trash2, Loader } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Upload() {
  const { t, language } = useLanguage()
  const [dragActive1, setDragActive1] = useState(false)
  const [dragActive2, setDragActive2] = useState(false)
  const [uploadedFile1, setUploadedFile1] = useState(null)
  const [uploadedFile2, setUploadedFile2] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Form state
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {  // ✅ ADD THIS
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [records, setRecords] = useState([])
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

  // Clear uploaded files when company changes (in case file requirements change)
  useEffect(() => {
    if (uploadedFile1 || uploadedFile2) {
      setUploadedFile1(null)
      setUploadedFile2(null)
      setError(null)
      setSuccess(null)
    }
  }, [selectedCompanyId])

  const handleDrag = (e, slot) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (slot === 1) setDragActive1(true)
      else setDragActive2(true)
    } else if (e.type === 'dragleave') {
      if (slot === 1) setDragActive1(false)
      else setDragActive2(false)
    }
  }

  const handleDrop = (e, slot) => {
    e.preventDefault()
    e.stopPropagation()
    if (slot === 1) setDragActive1(false)
    else setDragActive2(false)

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
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    )

    if (!excelFile) {
      setError('Please upload only Excel files (.xlsx or .xlsb)')
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
    } else {
      setUploadedFile2(fileObj)
    }
  }

  const removeFile = (slot) => {
    if (slot === 1) {
      setUploadedFile1(null)
    } else {
      setUploadedFile2(null)
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
    if (requiresTwoFiles() && !uploadedFile2) {
      setError('Please upload the second Excel file')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      let totalRowsInserted = 0
      const filesToUpload = [uploadedFile1]
      if (uploadedFile2) filesToUpload.push(uploadedFile2)

      // Upload files sequentially
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileObj = filesToUpload[i]
        const formData = new FormData()

        formData.append('file', fileObj.file) // Backend expects 'file' not 'files'
        formData.append('companyId', selectedCompanyId)
        formData.append('month', selectedMonth)

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
        } else {
          setUploadedFile2(prev => ({ ...prev, status: 'success' }))
        }
      }

      setSuccess(`Successfully uploaded ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}! ${totalRowsInserted} rows inserted.`)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'An error occurred during upload')
      if (uploadedFile1) setUploadedFile1(prev => ({ ...prev, status: 'error' }))
      if (uploadedFile2) setUploadedFile2(prev => ({ ...prev, status: 'error' }))
    } finally {
      setUploading(false)
    }
  }

  // Delete modal functions
  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      setDeleteError(null)

      const response = await fetch(`${API_ENDPOINTS.upload}/records`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch records')
      }

      setRecords(result.data || [])
    } catch (err) {
      console.error('Error fetching records:', err)
      setDeleteError(err.message || 'Failed to fetch records')
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
      setDeleting(`${companyId}-${month}`)
      setDeleteError(null)
      setDeleteSuccess(null)
      setConfirmModalOpen(false)

      const response = await fetch(`${API_ENDPOINTS.upload}/records`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          month: month
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete record')
      }

      setDeleteSuccess(`Successfully deleted record! ${result.summary?.rawDataDeleted || 0} raw data rows and ${result.summary?.aggregationsDeleted || 0} aggregation rows removed.`)

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

  // Helper function to check if company requires 2 files
  const requiresTwoFiles = () => {
    const companyId = parseInt(selectedCompanyId)
    return companyId === 4 || companyId === 7
  }

  // Helper function to get file labels
  const getFileLabel = (fileNumber) => {
    const companyId = parseInt(selectedCompanyId)

    if (companyId === 4) {
      return fileNumber === 1 ? 'הכשרה בסט' : 'הכשרה סיכונים'
    }

    // Default for company 7 or others requiring 2 files
    return `File ${fileNumber}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('uploadExcelFiles')}</h2>
            <p className="text-gray-600">{t('uploadCompanyData')}</p>
          </div>
          <button
            onClick={openDeleteModal}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Trash2 className="w-5 h-5" />
            {t('deleteRecord') || 'Delete a Record'}
          </button>
        </div>

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

        {/* ✅ UPDATE THIS SECTION - Change grid-cols to md:grid-cols-2 and add month picker */}
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
  {companies.map((company) => (
    <option key={company.id} value={company.id}>
      {language === 'he' ? company.name : company.name_en}
    </option>
  ))}
</select>
            </div>

            {/* ✅ ADD MONTH PICKER */}
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

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {requiresTwoFiles() ? `${t('step2UploadExcel')} (2 files required)` : t('step2UploadExcel')}
          </h3>

          <div className={`grid ${requiresTwoFiles() ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {/* First File Upload */}
            <div>
              {requiresTwoFiles() && (
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(1)}</h4>
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
                  accept=".xlsx,.xlsb"
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

            {/* Second File Upload (only for companies 4 & 7) */}
            {requiresTwoFiles() && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{getFileLabel(2)}</h4>
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
                    accept=".xlsx,.xlsb"
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

        {(uploadedFile1 || uploadedFile2) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {t('uploadedFile')}
                {requiresTwoFiles() && ` (${(uploadedFile1 ? 1 : 0) + (uploadedFile2 ? 1 : 0)}/2)`}
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
                        {requiresTwoFiles() && <span className="text-gray-500 text-sm mr-2">{getFileLabel(1)}:</span>}
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
                        <span className="text-gray-500 text-sm mr-2">{getFileLabel(2)}:</span>
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
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selectedCompanyId || !uploadedFile1 || (requiresTwoFiles() && !uploadedFile2) || uploading}
            className={`
              w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3
              ${selectedCompanyId && uploadedFile1 && (!requiresTwoFiles() || uploadedFile2) && !uploading
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
              requiresTwoFiles()
                ? 'Please upload 2 Excel files'
                : t('pleaseUploadExcelFile')
            )}
            {selectedCompanyId && uploadedFile1 && requiresTwoFiles() && !uploadedFile2 && (
              'Please upload the second Excel file'
            )}
            {selectedCompanyId && uploadedFile1 && (!requiresTwoFiles() || uploadedFile2) && !uploading && `${t('readyToSubmit')} ${new Date(selectedMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>

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
                        <h3 className="text-xl font-bold text-gray-900">{t('deleteRecord') || 'Delete a Record'}</h3>
                        <p className="text-sm text-gray-600">{t('selectRecordToDelete') || 'Select a record to delete from the system'}</p>
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

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                    ) : filteredRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <File className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-600 font-medium">{t('noRecordsFound') || 'No records found'}</p>
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