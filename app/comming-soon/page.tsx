export const dynamic = 'force-dynamic';

export default function ComingSoon() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#C8E6FF] to-[#5AA6FF]">
      <div className="max-w-xl bg-white/85 rounded-2xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-2">ただいまメンテナンス中</h1>
        <p className="text-gray-700 mb-6">
          新バージョン公開準備のため一時停止しています。<br/>
          公開後はこのURLでご案内します。
        </p>
        <div className="text-sm text-gray-500">
          お急ぎの方は <a className="underline" href="mailto:report@your-domain">report@your-domain</a> まで。
        </div>
      </div>
    </main>
  );
}
