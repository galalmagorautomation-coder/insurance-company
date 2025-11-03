import { useState, useEffect } from 'react'
import { Upload as UploadIcon, File, X, CheckCircle, Building2, Calendar, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Upload() {
  const { t, language } = useLanguage()
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
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

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files) => {
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
    setUploadedFile({
      file: excelFile,
      name: excelFile.name,
      size: (excelFile.size / 1024).toFixed(2) + ' KB',
      status: 'ready'
    })
  }

  const removeFile = () => {
    setUploadedFile(null)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedCompanyId) {
      setError('Please select a company')
      return
    }
    if (!selectedMonth) {  // ✅ ADD THIS
      setError('Please select a month')
      return
    }
    if (!uploadedFile) {
      setError('Please upload an Excel file')
      return
    }
  
    setUploading(true)
    setError(null)
    setSuccess(null)
  
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile.file)
      formData.append('companyId', selectedCompanyId)
      formData.append('month', selectedMonth)
  
      const response = await fetch(`${API_ENDPOINTS.upload}/upload`, {
        method: 'POST',
        body: formData
      })
  
      const result = await response.json()
  
      if (!response.ok) {
        throw new Error(result.message || 'Upload failed')
      }
  
      setSuccess(`Successfully uploaded! ${result.summary?.rowsInserted || 0} rows inserted.`)
      setUploadedFile(prev => ({ ...prev, status: 'success' }))
  
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'An error occurred during upload')
      setUploadedFile(prev => ({ ...prev, status: 'error' }))
    } finally {
      setUploading(false)
    }
  }

  const selectedCompany = companies.find(c => c.id === parseInt(selectedCompanyId))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('uploadExcelFiles')}</h2>
          <p className="text-gray-600">{t('uploadCompanyData')}</p>
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
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('step2UploadExcel')}</h3>
          <form
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="file"
              id="file-upload"
              accept=".xlsx,.xlsb"
              onChange={handleChange}
              className="hidden"
            />
            
            <label
              htmlFor="file-upload"
              className={`
                flex flex-col items-center justify-center
                border-3 border-dashed rounded-2xl p-12 cursor-pointer
                transition-all duration-200
                ${dragActive 
                  ? 'border-brand-primary bg-blue-50' 
                  : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
                }
              `}
            >
              <div className={`
                w-20 h-20 rounded-full flex items-center justify-center mb-4
                ${dragActive ? 'bg-brand-primary' : 'bg-blue-100'}
              `}>
                <UploadIcon className={`w-10 h-10 ${dragActive ? 'text-white' : 'text-brand-primary'}`} />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {dragActive ? t('dropFileHere') : t('uploadExcelFile')}
              </h3>
              
              <p className="text-gray-600 mb-4 text-center">
                {t('dragAndDropBrowse')}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  {t('excelSupported')}
                </span>
              </div>
            </label>
          </form>

          {uploading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-3 text-brand-primary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                <span className="font-semibold">{t('uploadingProcessing')}</span>
              </div>
            </div>
          )}
        </div>

        {uploadedFile && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('uploadedFile')}</h3>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                  uploadedFile.status === 'success' ? 'bg-green-100' : 
                  uploadedFile.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <File className={`w-6 h-6 ${
                    uploadedFile.status === 'success' ? 'text-green-600' : 
                    uploadedFile.status === 'error' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{uploadedFile.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{uploadedFile.size}</span>
                    {uploadedFile.status === 'success' && (
                      <>
                        <span>•</span>
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('uploadedSuccessfully')}
                        </span>
                      </>
                    )}
                    {uploadedFile.status === 'error' && (
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
                onClick={removeFile}
                className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selectedCompanyId || !uploadedFile || uploading}
            className={`
              w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3
              ${selectedCompanyId && uploadedFile && !uploading
                ? 'bg-brand-primary text-white hover:bg-primary-600 hover:shadow-xl transform hover:scale-[1.02]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <CheckCircle className="w-6 h-6" />
           
{uploading ? t('processing') : `${t('submitDataFor')} ${selectedCompany ? (language === 'he' ? selectedCompany.name : selectedCompany.name_en) : t('selectedCompany')}`}
          </button>
          
          {/* ✅ UPDATE INFO TEXT */}
          <p className="text-center text-sm text-gray-500 mt-3">
            {!selectedCompanyId && t('pleaseSelectCompany')}
            {selectedCompanyId && !uploadedFile && t('pleaseUploadExcelFile')}
            {selectedCompanyId && uploadedFile && !uploading && `${t('readyToSubmit')} ${new Date(selectedMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>
      </main>
    </div>
  )
}

export default Upload