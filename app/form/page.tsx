'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

type StepId = 1 | 2; // まずは2ステップ構成に縮小

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

export default function FormPage() {
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // URLの resultId を拾う
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('resultId') || '';
    if (rid) setFormData((p) => ({ ...p, resultId: rid }));
  }, []);

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // 今は step1 と step2 のみ検証
  const validateStep = (step: StepId) => {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.agreement) nextErrors.agreement = 'この項目への同意が必要です';
    }
    if (step === 2) {
      if (!formData.name.trim()) nextErrors.name = '氏名は必須です';
      const email = formData.email.trim();
      if (!email) {
        nextErrors.email = 'メールアドレスは必須です';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) nextErrors.email = '有効なメールアドレスを入力してください';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = async () => {
    if (!validateStep(currentStep)) return;

    // 今は2ステップ目が「送信」扱い
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      // 送信
      try {
        if (formData.resultId) {
          await supabase
            .from('samurairesults')
            .update({
              name: formData.name,
              email: formData.email,
            })
            .eq('id', formData.resultId);
        }
      } catch (e) {
        // 失敗しても一旦は完了画面へ（後で改善）
        console.error(e);
      } finally {
        setIsSubmitted(true);
      }
    }
  };

  const prevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
  };

  // 完了画面（超シンプル）
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-xl w-full text-center space-y-6">
            <h1 className="text-3xl font-bold">送信ありがとうございました！</h1>
            <p className="text-gray-700">入力いただいた情報を受け付けました。</p>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              診断に戻る
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-8">
          <h1 className="text-2xl font-bold text-center">詳細レポートお申込み（簡易版）</h1>

          {/* Step 1: 同意 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="agreement"
                  checked={formData.agreement}
                  onCheckedChange={(checked) => updateFormData('agreement', Boolean(checked))}
                  className="mt-1"
                />
                <Label htmlFor="agreement" className="cursor-pointer">
                  個別アドバイス付き詳細レポート（PDF）をメールで受け取る（無料）
                  <span className="text-red-500 ml-1">*</span>
                </Label>
              </div>
              {errors.agreement && <p className="text-red-500 text-sm">{errors.agreement}</p>}

              <div className="flex justify-end">
                <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
                  次へ
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: 氏名・メール */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
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
                <Label htmlFor="email">
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

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={prevStep}>
                  戻る
                </Button>
                <Button onClick={nextStep} className="bg-green-600 hover:bg-green-700">
                  送信
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
