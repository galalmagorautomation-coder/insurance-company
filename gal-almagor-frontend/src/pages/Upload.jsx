import { useState } from 'react'
import { Upload as UploadIcon, File, X, CheckCircle, Building2, Calendar } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'

function Upload() {
  const { t } = useLanguage()
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  
  // Form state
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // List of companies
  const companies = [
    'Company 1',
    'Company 2',
    'Company 3',
    'Company 4',
    'Company 5',
    'Company 6',
    'Company 7',
    'Company 8',
    'Company 9',
    'Company 10',
    'Company 11',
    'Company 12'
  ]

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
    const csvFiles = Array.from(files).filter(file => 
      file.name.endsWith('.csv') || file.type === 'text/csv'
    )

    if (csvFiles.length === 0) {
      alert('Please upload only CSV files')
      return
    }

    setUploading(true)
    
    // Simulate upload process
    setTimeout(() => {
      const newFiles = csvFiles.map(file => ({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        status: 'success',
        rows: Math.floor(Math.random() * 10000) + 1000
      }))
      
      setUploadedFiles([...uploadedFiles, ...newFiles])
      setUploading(false)
    }, 1500)
  }

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedCompany) {
      alert('Please select a company')
      return
    }
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one CSV file')
      return
    }
    console.log('Submitted:', { 
      company: selectedCompany, 
      month: selectedMonth,
      files: uploadedFiles 
    })
    alert('Data submitted successfully!')
    // Add your submission logic here
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('uploadCSVFilesTitle')}</h2>
          <p className="text-gray-600">{t('uploadForAnalysis')}</p>
        </div>

        {/* Company and Month Selection Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('step1')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Dropdown */}
            <div>
              <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('selectCompany')}
              </label>
              <select
                id="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="block w-full px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium shadow-sm"
                required
              >
                <option value="">{t('chooseCompany')}</option>
                {companies.map((company, index) => (
                  <option key={index} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Picker */}
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
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('step2')}</h3>
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
              multiple
              accept=".csv"
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
                {dragActive ? t('dropFiles') : t('uploadCSVFilesTitle')}
              </h3>
              
              <p className="text-gray-600 mb-4 text-center">
                {t('dragDrop')}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  {t('csvFilesOnly')}
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  {t('multipleSupported')}
                </span>
              </div>
            </label>
          </form>

          {uploading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-3 text-brand-primary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                <span className="font-semibold">{t('uploadingFiles')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('uploadedFiles')}</h3>
              <span className="text-sm text-gray-600">{uploadedFiles.length} {t('files')}</span>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-brand-primary transition-colors"
                >
                  <div className="flex items-center flex-1">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <File className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{file.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>{file.rows.toLocaleString()} {t('rows')}</span>
                        {file.status === 'success' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('uploadedSuccessfully')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Clear All Button */}
            <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setUploadedFiles([])}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                <X className="w-4 h-4 inline mr-2" />
                {t('clearAllFiles')}
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selectedCompany || uploadedFiles.length === 0}
            className={`
              w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3
              ${selectedCompany && uploadedFiles.length > 0
                ? 'bg-brand-primary text-white hover:bg-primary-600 hover:shadow-xl transform hover:scale-[1.02]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <CheckCircle className="w-6 h-6" />
            {t('submitDataFor')} {selectedCompany || t('selectedCompany')}
          </button>
          
          {/* Info text */}
          <p className="text-center text-sm text-gray-500 mt-3">
            {!selectedCompany && t('pleaseSelectCompany')}
            {selectedCompany && uploadedFiles.length === 0 && t('pleaseUploadFile')}
            {selectedCompany && uploadedFiles.length > 0 && `${t('readyToSubmit')} ${uploadedFiles.length} ${t('files')} for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>
      </main>
    </div>
  )
}

export default Upload

