'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Download, MessageCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

interface FormData {
  agreement: boolean;
  name: string;
  email: string;
  company: string;
  industry: string;
  ageRange: string;
  companySize: string;
  resultId: string;
}

const initialFormData: FormData = {
  agreement: false,
  name: '',
  email: '',
  company: '',
  industry: '',
  ageRange: '',
  companySize: '',
  resultId: '',
};

const steps = [
  { id: 1, title: '確認チェック', fields: ['agreement'] },
  { id: 2, title: '基本情報', fields: ['name', 'email'] },
  { id: 3, title: '会社情報', fields: ['company', 'industry', 'ageRange', 'companySize'] },
];

export default function FormPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get resultId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('resultId');
    if (resultId) {
      setFormData(prev => ({ ...prev, resultId }));
    }
  }, []);

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const currentStepData = steps.find(s => s.id === step);
    
    if (!currentStepData) return true;

    currentStepData.fields.forEach(field => {
      const fieldKey = field as keyof FormData;
      
      // Step 1: Agreement validation
      if (field === 'agreement' && !formData.agreement) {
        newErrors.agreement = 'この項目への同意が必要です';
      }
      
      // Step 2: Required field validation
      if (['name', 'email'].includes(field)) {
        if (!formData[fieldKey] || (typeof formData[fieldKey] === 'string' && !(formData[fieldKey] as string).trim())) {
          newErrors[fieldKey] = 'この項目は必須です';
        }
      }
      
      // Step 3: Required field validation
      if (['ageRange', 'companySize'].includes(field)) {
        if (!formData[fieldKey] || (typeof formData[fieldKey] === 'string' && !(formData[fieldKey] as string).trim())) {
          newErrors[fieldKey] = 'この項目は必須です';
        }
      }
      
      // Email validation
      if (field === 'email' && formData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          newErrors.email = '有効なメールアドレスを入力してください';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      try {
        // Save form data to Supabase
        const { data, error } = await supabase
          .from('samurairesults')
          .update({
            name: formData.name,
            email: formData.email,
            company_size: formData.companySize,
          })
          .eq('id', formData.resultId);

        if (error) {
          console.error('Error updating Supabase:', error);
        } else {
          console.log('Form data saved successfully');
        }

        setIsSubmitted(true);
      } catch (error) {
        console.error('Error submitting form:', error);
        setIsSubmitted(true); // Still show success page even if save fails
      }
    }
  };

  const progressPercentage = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="max-w-4xl w-full text-center space-y-8">
            {/* Thank You Message */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">
                お申込みありがとうございました！
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 mb-8">
                ご登録のメールアドレス宛に、詳細レポート（PDF）をお送りしました。
              </p>
            </div>

            {/* LINE Open Chat Section */}
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* Left side: Text and Button */}
                    <div className="text-center md:text-left space-y-4">
                      <MessageCircle className="w-12 h-12 text-green-600 mx-auto md:mx-0" />
                      <h3 className="text-2xl font-semibold text-gray-800">
                        オープンチャット参加
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        🏯AI時代の経営者 武将タイプ診断⚔<br />
                        経営の"進化スピード"を高めるヒントをお届け中！
                      </p>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                        onClick={() => window.open('https://line.me/ti/g2/io1H7Z8HNtAroi0IwaiGanAU5l_6-3YltTd-Rw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default', '_blank')}
                      >
                        オープンチャットに参加する
                      </Button>
                    </div>
                    
                    {/* Right side: QR Code */}
                    <div className="text-center">
                      <img 
                        src="/images/qr-openchat.jpg" 
                        alt="LINEオープンチャット QRコード"
                        className="w-[180px] h-auto mx-auto border-2 border-gray-200 rounded-lg shadow-md"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        QRコードからもアクセス可能
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Back to Quiz Button */}
            <div className="mt-8">
              <Button 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => window.location.href = '/'}
              >
                診断に戻る
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Progress Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-black">
              詳細レポートお申込みフォーム
            </h1>
            <div className="space-y-2">
              <p className="text-lg text-gray-600">
                ステップ {currentStep} / {steps.length}: {steps.find(s => s.id === currentStep)?.title}
              </p>
              <Progress value={progressPercentage} className="w-full h-2" />
            </div>
          </div>

          {/* Form Card */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {steps.find(s => s.id === currentStep)?.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Agreement Check */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <p className="text-base font-medium text-gray-800">
                      以下の内容に同意して詳細レポートを申し込みます
                    </p>
                    
                    <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                      <Checkbox
                        id="agreement"
                        checked={formData.agreement}
                        onCheckedChange={(checked) => updateFormData('agreement', checked as boolean)}
                        className="mt-1"
                      />
                      <Label htmlFor="agreement" className="text-base cursor-pointer leading-relaxed">
                        個別アドバイス付き詳細レポート（PDF）をメールで受け取る（無料）
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                    </div>
                    {errors.agreement && <p className="text-red-500 text-sm">{errors.agreement}</p>}
                  </div>
                </div>
              )}

              {/* Step 2: Basic Information */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-medium">
                      氏名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="山田太郎"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-medium">
                      メールアドレス <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="example@company.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                  </div>
                </div>
              )}

              {/* Step 3: Company Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-base font-medium">
                      会社名・屋号
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => updateFormData('company', e.target.value)}
                      placeholder="株式会社サンプル"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-base font-medium">
                      業種
                    </Label>
                    <Input
                      id="industry"
                      type="text"
                      value={formData.industry}
                      onChange={(e) => updateFormData('industry', e.target.value)}
                      placeholder="製造業、IT、サービス業など"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      年代 <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={formData.ageRange}
                      onValueChange={(value) => updateFormData('ageRange', value)}
                      className="space-y-2"
                    >
                      {['30代以下', '40代', '50代', '60代', '70代以上'].map((age, index) => {
                        const safeId = `age-${index}`;
                        return (
                          <div key={age} className="flex items-center space-x-2">
                            <RadioGroupItem value={age} id={safeId} />
                            <Label htmlFor={safeId} className="text-base cursor-pointer">
                              {age}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                    {errors.ageRange && <p className="text-red-500 text-sm">{errors.ageRange}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      従業員数 <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.companySize} onValueChange={(value) => updateFormData('companySize', value)}>
                      <SelectTrigger className={errors.companySize ? 'border-red-500' : ''}>
                        <SelectValue placeholder="従業員数を選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1人（個人事業主）">1人（個人事業主）</SelectItem>
                        <SelectItem value="2-10人">2-10人</SelectItem>
                        <SelectItem value="11-50人">11-50人</SelectItem>
                        <SelectItem value="51-100人">51-100人</SelectItem>
                        <SelectItem value="101-500人">101-500人</SelectItem>
                        <SelectItem value="501人以上">501人以上</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.companySize && <p className="text-red-500 text-sm">{errors.companySize}</p>}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </Button>

                {currentStep < steps.length ? (
                  <Button
                    onClick={nextStep}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <span>次へ</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>レポートを申し込む</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}