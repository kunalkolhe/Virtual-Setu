import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, CheckCircle, AlertCircle, ShieldCheck, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { logActivity } from '@/lib/activityLog';
import { saveExpiry } from '@/lib/documentExpiry';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

const DOCUMENT_CATEGORY_KEYS = [
  {
    groupKey: 'group_identity',
    groupDefault: 'Identity',
    types: [
      'aadhaar', 'pan_card', 'voter_id', 'passport', 'driving_license',
      'ration_card', 'npr_card', 'senior_citizen_card', 'disability_certificate', 'arms_license',
    ],
  },
  {
    groupKey: 'group_birth_family',
    groupDefault: 'Birth & Family',
    types: [
      'birth_certificate', 'death_certificate', 'marriage_certificate', 'divorce_certificate',
      'adoption_certificate', 'legal_heir_certificate', 'family_certificate',
    ],
  },
  {
    groupKey: 'group_education',
    groupDefault: 'Education',
    types: [
      'class_10_marksheet', 'class_12_marksheet', 'graduation_certificate', 'postgrad_certificate',
      'diploma_certificate', 'transfer_certificate', 'migration_certificate', 'bonafide_certificate',
      'character_certificate', 'scholarship_certificate', 'provisional_certificate',
    ],
  },
  {
    groupKey: 'group_income_finance',
    groupDefault: 'Income & Finance',
    types: [
      'income_certificate', 'salary_slip', 'form_16', 'itr', 'bank_statement',
      'passbook', 'cancelled_cheque', 'gst_certificate', 'pan_business', 'udyam_certificate',
    ],
  },
  {
    groupKey: 'group_property_land',
    groupDefault: 'Property & Land',
    types: [
      'property_deed', 'land_record', 'encumbrance_certificate', 'property_tax_receipt',
      'rental_agreement', 'noc_property', 'electricity_bill', 'water_bill', 'gas_connection',
    ],
  },
  {
    groupKey: 'group_category_community',
    groupDefault: 'Category / Community',
    types: [
      'caste_certificate', 'domicile_certificate', 'obc_certificate', 'sc_st_certificate',
      'ews_certificate', 'minority_certificate', 'nationality_certificate',
    ],
  },
  {
    groupKey: 'group_employment',
    groupDefault: 'Employment',
    types: [
      'employment_certificate', 'relieving_letter', 'offer_letter', 'appointment_letter',
      'service_certificate', 'police_clearance', 'noc_employer',
    ],
  },
  {
    groupKey: 'group_health_medical',
    groupDefault: 'Health & Medical',
    types: [
      'medical_certificate', 'vaccination_certificate', 'covid_certificate',
      'health_card', 'blood_group_report', 'insurance_policy',
    ],
  },
  {
    groupKey: 'group_vehicle',
    groupDefault: 'Vehicle',
    types: ['vehicle_rc', 'vehicle_insurance', 'puc_certificate', 'vehicle_fitness'],
  },
  {
    groupKey: 'group_legal_misc',
    groupDefault: 'Legal & Miscellaneous',
    types: ['affidavit', 'power_of_attorney', 'gazette_notification', 'noc_police', 'court_order', 'other'],
  },
];

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const { t } = useTranslation('common');
  const { t: tDocs } = useTranslation('documents');
  const { user } = useAuth();
  const { verify, state: verifyState, result: verifyResult, reset: resetVerify } = useDocumentVerification();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typeOpen, setTypeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDocLabel = (typeKey: string) =>
    tDocs(`${typeKey}.name`, typeKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()));

  const selectedTypeLabel = documentType ? getDocLabel(documentType) : '';

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType('');
    setDocumentName('');
    setUploadProgress(0);
    resetVerify();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only JPG, PNG, or PDF files');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    resetVerify();
    if (!documentName) setDocumentName(file.name.split('.')[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const fakeEvent = {
      target: { files: [file] as unknown as FileList },
    } as React.ChangeEvent<HTMLInputElement>;
    handleFileSelect(fakeEvent);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setDocumentName('');
    resetVerify();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVerifyAndUpload = async () => {
    if (!selectedFile || !documentType || !documentName.trim() || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.info('AI is verifying your document…');
    const result = await verify(selectedFile, documentType);

    if (!result) {
      toast.error('Verification could not be completed. Please try again.');
      return;
    }

    const msgLower = (result.message ?? '').toLowerCase();
    const RED_FLAGS = [
      'sample', 'specimen', 'fake', 'not genuine', 'not real', 'not authentic',
      'not a genuine', 'not an authentic', 'illustrative', 'template', 'demo',
      'watermark', 'immihelp', 'not valid', 'not issued', 'not official', 'placeholder',
    ];
    const forceFailed = RED_FLAGS.some((f) => msgLower.includes(f));

    if (!result.isValid || forceFailed) {
      toast.error(result.message || 'This document could not be verified. Please upload a genuine document.');
      if (user) {
        logActivity(user.id, {
          type: 'verify_failed',
          title: documentName.trim() || selectedFile.name,
          description: result.message || 'Document rejected — could not be verified as genuine.',
        });
      }
      return;
    }

    setUploading(true);
    setUploadProgress(30);

    try {
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${timestamp}_${documentName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      const { data: insertedDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          document_name: documentName.trim(),
          file_url: filePath,
          verification_status: 'verified',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      if (insertedDoc?.id) {
        saveExpiry(user.id, insertedDoc.id, {
          expiryDate: result.expiryDate ?? null,
          documentNumber: result.documentNumber ?? null,
          storedAt: new Date().toISOString(),
        });
      }

      setUploadProgress(100);

      const expiryNote = result.expiryDate
        ? ` · Expires ${new Date(result.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : '';
      toast.success(`${t('upload.success')}${expiryNote}`);

      if (user) {
        logActivity(user.id, {
          type: 'upload_success',
          title: documentName.trim(),
          description: `${getDocLabel(documentType)} verified and saved successfully.`,
        });
      }
      resetForm();
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('upload.error'));
      if (user) {
        logActivity(user.id, {
          type: 'upload_failed',
          title: documentName.trim() || selectedFile?.name || 'Unknown document',
          description: 'Upload failed due to a server error. Please try again.',
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const isVerifying = verifyState === 'verifying';
  const isBusy = isVerifying || uploading;

  return (
    <Card className="card-3d border-0">
      <CardHeader>
        <CardTitle>{t('upload.title')}</CardTitle>
        <CardDescription>
          {t('upload.verifying')} JPG, PNG, PDF (max 5MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Drop Zone */}
        <div
          className="border-2 border-dashed border-border/20 rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isBusy && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
          />

          {selectedFile ? (
            <div className="flex items-center justify-center space-x-3">
              <FileText className="h-12 w-12 text-primary" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">{t('upload.choose_file')}</p>
                <p className="text-sm text-muted-foreground">JPG, PNG or PDF up to 5MB</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Verification Status Banner */}
        {verifyState !== 'idle' && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
              verifyState === 'verifying'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : verifyState === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {verifyState === 'verifying' && <Loader2 className="h-5 w-5 mt-0.5 animate-spin flex-shrink-0" />}
            {verifyState === 'success'   && <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
            {verifyState === 'error'     && <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
            <div>
              <p className="text-sm font-semibold">
                {verifyState === 'verifying' && t('upload.verifying')}
                {verifyState === 'success'   && `${t('status.verified')} — ${verifyResult?.detectedType}`}
                {verifyState === 'error'     && t('errors.upload_failed')}
              </p>
              {verifyResult?.message && (
                <p className="text-sm opacity-80 mt-0.5">{verifyResult.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('upload.uploading')}</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Searchable Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document-type">{t('upload.select_type')} *</Label>
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="document-type"
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeOpen}
                  disabled={isBusy}
                  className="w-full justify-between font-normal"
                >
                  <span className={cn(!selectedTypeLabel && 'text-muted-foreground')}>
                    {selectedTypeLabel || t('upload.select_type')}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('doclist.search_placeholder')} />
                  <CommandList className="max-h-72">
                    <CommandEmpty>{t('doclist.no_match')}</CommandEmpty>
                    {DOCUMENT_CATEGORY_KEYS.map((category) => (
                      <CommandGroup key={category.groupKey} heading={category.groupDefault}>
                        {category.types.map((typeKey) => (
                          <CommandItem
                            key={typeKey}
                            value={getDocLabel(typeKey)}
                            onSelect={() => {
                              setDocumentType(typeKey);
                              resetVerify();
                              setTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 flex-shrink-0',
                                documentType === typeKey ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {getDocLabel(typeKey)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-name">{t('upload.document_name')} *</Label>
            <Input
              id="document-name"
              placeholder={t('upload.document_name')}
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              disabled={isBusy}
            />
          </div>
        </div>

        {/* Primary Action */}
        <Button
          onClick={handleVerifyAndUpload}
          disabled={!selectedFile || !documentType || !documentName.trim() || isBusy || verifyState === 'error'}
          className="w-full bg-gradient-primary glow-primary"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('upload.verifying')}
            </>
          ) : uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('upload.uploading')}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" />
              {t('upload.title')}
            </>
          )}
        </Button>

        {/* Retry after failed verification */}
        {verifyState === 'error' && (
          <Button
            variant="outline"
            onClick={resetVerify}
            className="w-full"
          >
            {t('actions.cancel')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
