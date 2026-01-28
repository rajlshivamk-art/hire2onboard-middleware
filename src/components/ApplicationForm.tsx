import { useEffect, useState } from "react";
import { Upload, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Job } from "../types";

interface ApplicationFormProps {
  jobId: string;
  initialSource?: string;
  onBack: () => void;
  onSubmit: (application: any) => void;
}

export function ApplicationForm({
  jobId,
  initialSource,
  onBack,
  onSubmit,
}: ApplicationFormProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await api.jobs.getById(jobId);
        setJob(data);
      } catch (err) {
        console.error("Failed to fetch job:", err);
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const [hasReferral, setHasReferral] = useState<"no" | "yes">(
    "no",
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentSalary: "",
    expectedSalary: "",
    resumeFile: null as File | null,
    resumeUrl: "", // Store URL here after upload
    coverLetter: "",
    linkedIn: "",
    portfolio: "",
    yearsOfExperience: "",
    referredBy: "",
    skills: "",
  });

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [fileSizeInfo, setFileSizeInfo] = useState<string>("");


  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeInKB = (file.size / 1024).toFixed(0);

      // Validation (50KB - 2MB)
      const minSize = 50 * 1024; // 50KB
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (file.size < minSize) {
        setErrors({ ...errors, resumeFile: `File too small (${sizeInKB}KB). Min size is 50KB.` });
        return;
      }


      if (file.size > maxSize) {
        setErrors({ ...errors, resumeFile: `File too large (${sizeInMB}MB). Max size is 2MB.` });
        return;
      }


      setFormData({
        ...formData,
        resumeFile: file,
      });
      setErrors({ ...errors, resumeFile: "" });
      setFileSizeInfo(`${sizeInKB} KB`); // Store size info

      // Auto-upload
      setUploadStatus('uploading');
      try {
        const uploadResult = await api.applications.uploadResume(file);
        setFormData(prev => ({ ...prev, resumeUrl: uploadResult.url, resumeFile: file }));
        setUploadStatus('success');
      } catch (err: any) {
        console.error("Upload failed", err);
        setUploadStatus('error');

        let msg = "Upload failed.";
        if (err.response) {
          // Server responded with a status code
          const detail = err.response.data?.detail;
          const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
          msg = `Server Error (${err.response.status}): ${detailStr || err.response.statusText}`;
        } else if (err.request) {
          // Request made but no response
          msg = "Network Error: No response from server. Check if backend is running.";
        } else {
          // Something else happened
          msg = `Error: ${err.message}`;
        }

        setErrors(prev => ({ ...prev, resumeFile: msg }));
      }
    }
  };




  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = "Full name is required (min 2 characters)";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    if (!formData.yearsOfExperience) {
      newErrors.yearsOfExperience = "Years of experience is required";
    } else if (parseInt(formData.yearsOfExperience) < 0) {
      newErrors.yearsOfExperience = "Cannot be negative";
    }

    if (!formData.expectedSalary) {
      newErrors.expectedSalary = "Expected salary is required";
    } else if (parseInt(formData.expectedSalary) <= 0) {
      newErrors.expectedSalary = "Must be greater than 0";
    }

    if (!formData.resumeFile) {
      newErrors.resumeFile = "Resume is required";
    }

    if (formData.linkedIn && !/^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.*)?$/.test(formData.linkedIn.trim())) {
      newErrors.linkedIn = "Invalid URL (e.g. linkedin.com/in/name)";
    }

    if (formData.portfolio && !/^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.*)?$/.test(formData.portfolio.trim())) {
      newErrors.portfolio = "Invalid URL";
    }

    if (hasReferral === "yes" && !formData.referredBy?.trim()) {
      newErrors.referredBy = "Referrer's name is required";
    }

    if (!formData.skills.trim()) {
      newErrors.skills = "At least one skill is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to top or first error could be implemented here
      return;
    }

    setLoading(true);
    setError(null);

    const skillsArray = formData.skills
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);


    // Create application object
    const application = {
      id: "c" + Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      resumeUrl: formData.resumeUrl || "#", // Use the uploaded URL
      skills: skillsArray,


      jobId: jobId,
      stage: "Applied" as const,
      appliedDate: new Date().toISOString(),
      source: initialSource || "Career Site",
      feedback: [],
      currentSalary: formData.currentSalary
        ? parseInt(formData.currentSalary)
        : undefined,
      expectedSalary: formData.expectedSalary
        ? parseInt(formData.expectedSalary)
        : undefined,
      referredBy: formData.referredBy || undefined,
      // New fields for persistence
      coverLetter: formData.coverLetter,
      linkedIn: formData.linkedIn,
      portfolio: formData.portfolio,
      yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
    };

    try {
      // Resume already uploaded in handleFileChange
      if (!formData.resumeUrl || formData.resumeUrl === "#") {
        // Fallback if they managed to submit without upload finishing (should be blocked by UI but safe to check)
        // But since we block submit, we might just proceed or error.
        // user might have selected file but upload failed?
        if (formData.resumeFile && uploadStatus !== 'success') {
          setError("Please wait for resume upload to complete.");
          setLoading(false);
          return;
        }
      }

      const submissionData = { ...application, resumeUrl: formData.resumeUrl };

      await api.applications.submit(submissionData);
      onSubmit(submissionData);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit application:", err);
      setError("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{error || "Job not found"}</p>
        <button
          onClick={onBack}
          className="ml-4 text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-gray-900 mb-4">
            Application Submitted!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for applying to{" "}
            <strong>{job.title}</strong>. We've received your
            application and will review it shortly.
          </p>
          <p className="text-gray-600 mb-8">
            You'll receive an email confirmation at{" "}
            <strong>{formData.email}</strong> with next steps.
          </p>
          {/* Back to Job Board button removed as per requirement */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {job.company ? job.company.substring(0, 1) : "R"}
              </span>
            </div>
            <h1 className="text-blue-600 tracking-tight">
              {job.company || "Recruitment HRMS"}
            </h1>
          </div>
          {/* Back button removed as per requirement */}
          <h2 className="text-gray-900 mb-2">
            Apply for {job.title}
          </h2>
          <p className="text-gray-600">
            {job.department} • {job.location}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-gray-900 mb-4">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="John Doe"
                  // required - Using custom validation
                  />
                  {errors.name && <p className="text-red-600 font-medium text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="john@example.com"
                  // required
                  />
                  {errors.email && <p className="text-red-600 font-medium text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits
                      if (/^\d*$/.test(value)) {
                        setFormData({
                          ...formData,
                          phone: value,
                        });
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  {errors.phone && <p className="text-red-600 font-medium text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        yearsOfExperience: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.yearsOfExperience ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="5"
                    min="0"
                  // required
                  />
                  {errors.yearsOfExperience && <p className="text-red-600 font-medium text-sm mt-1">{errors.yearsOfExperience}</p>}
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-gray-900 mb-4">Key Skills *</h2>

              <textarea
                value={formData.skills}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    skills: e.target.value,
                  })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.skills ? "border-red-500" : "border-blue-300"
                  }`}
                rows={3}
                placeholder="e.g. React, Node.js, SQL"
              />

              {errors.skills && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  {errors.skills}
                </p>
              )}

              <p className="text-sm text-blue-700 mt-2">
                Separate skills using commas
              </p>
            </div>

            {/* Salary Information */}
            <div>
              <h2 className="text-gray-900 mb-4">
                Salary Expectations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Current Salary (INR)
                  </label>
                  <input
                    type="number"
                    value={formData.currentSalary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentSalary: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100000"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Expected Salary (INR) *
                  </label>
                  <input
                    type="number"
                    value={formData.expectedSalary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedSalary: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.expectedSalary ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="120000"
                  // required
                  />
                  {errors.expectedSalary && <p className="text-red-600 font-medium text-sm mt-1">{errors.expectedSalary}</p>}
                </div>
              </div>
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-gray-700 mb-2">
                Resume/CV *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${errors.resumeFile ? 'border-red-500 bg-red-50' :
                uploadStatus === 'success' ? 'border-green-500 bg-green-50' :
                  uploadStatus === 'uploading' ? 'border-yellow-400 bg-yellow-50' :
                    'border-gray-300 hover:border-blue-400'
                }`}>
                <Upload className={`w-12 h-12 mx-auto mb-4 ${errors.resumeFile ? 'text-red-400' :
                  uploadStatus === 'success' ? 'text-green-500' :
                    'text-gray-400'
                  }`} />
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="resume-upload"
                  disabled={uploadStatus === 'uploading'}
                // required
                />
                <label
                  htmlFor="resume-upload"
                  className={`cursor-pointer text-blue-600 hover:underline ${uploadStatus === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Click to upload'}
                </label>

                <div className="mt-2 text-sm space-y-1">
                  <p className="text-gray-500">Required: PDF, DOC, or DOCX (50KB - 2MB)</p>


                  {/* Status Messages */}
                  {uploadStatus === 'uploading' && (
                    <p className="text-red-600 font-medium animate-pulse">
                      ⚠ Uploading... Please wait
                    </p>
                  )}

                  {uploadStatus === 'success' && formData.resumeFile && (
                    <div className="text-green-700 font-medium">
                      <p>✔ Upload Complete</p>
                      <p className="text-xs text-green-600">{formData.resumeFile.name} ({fileSizeInfo})</p>
                    </div>
                  )}
                </div>

                {errors.resumeFile && (
                  <p className="text-red-500 text-sm mt-2">{errors.resumeFile}</p>
                )}
              </div>
            </div>


            {/* Links */}
            <div>
              <h2 className="text-gray-900 mb-4">
                Professional Links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">
                    LinkedIn Profile
                  </label>
                  <input
                    type="text"
                    value={formData.linkedIn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        linkedIn: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.linkedIn ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                  {errors.linkedIn && <p className="text-red-600 font-medium text-sm mt-1">{errors.linkedIn}</p>}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Portfolio/Website
                  </label>
                  <input
                    type="text"
                    value={formData.portfolio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        portfolio: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.portfolio ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="https://johndoe.com"
                  />
                  {errors.portfolio && <p className="text-red-600 font-medium text-sm mt-1">{errors.portfolio}</p>}
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            <div>
              <label className="block text-gray-700 mb-2">
                Cover Letter
              </label>
              <textarea
                value={formData.coverLetter}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    coverLetter: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="Tell us why you're interested in this position and what makes you a great fit..."
              />
            </div>

            {/* Referral Section */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-gray-900 mb-4">
                Employee Referral
              </h2>

              <div className="mb-4">
                <label className="block text-gray-700 mb-3">
                  Were you referred by someone from our company?
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasReferral"
                      value="no"
                      checked={hasReferral === "no"}
                      onChange={() => {
                        setHasReferral("no");
                        setFormData({
                          ...formData,
                          referredBy: "",
                        });
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">No</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasReferral"
                      value="yes"
                      checked={hasReferral === "yes"}
                      onChange={() => setHasReferral("yes")}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Yes</span>
                  </label>
                </div>
              </div>

              {/* Referral Name Input - Shows when "Yes" is selected */}
              {hasReferral === "yes" && (
                <div className="animate-fadeIn">
                  <label className="block text-gray-700 mb-2">
                    Referrer's Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.referredBy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        referredBy: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white ${errors.referredBy ? 'border-red-500' : 'border-purple-300'}`}
                    placeholder="Enter the name of the employee who referred you"
                  // required
                  />
                  {errors.referredBy && <p className="text-red-500 text-sm mt-1">{errors.referredBy}</p>}
                  <p className="text-purple-600 text-sm mt-2">
                    Please enter the full name of the employee
                    who referred you to this position.
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={uploadStatus === 'uploading'}
                className={`flex-1 text-white py-4 rounded-lg transition-colors ${uploadStatus === 'uploading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >

                Submit Application
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
