import React from 'react';
import { ShieldCheck, Scale, ExternalLink } from 'lucide-react';

const LicenseView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-500 mb-8">
        {/* Header derived from PDF */}
        <div className="text-center mb-10">
             <div className="flex justify-center gap-2 mb-4">
                <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="CC" className="h-12 w-12" />
                <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="BY" className="h-12 w-12" />
                <img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="NC" className="h-12 w-12" />
                <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="SA" className="h-12 w-12" />
             </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional</h1>
            <p className="text-slate-500 font-medium">CC BY-NC-SA 4.0</p>
        </div>
        
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 mb-8 rounded-r-lg">
            <p className="font-bold text-yellow-800 text-sm">Nota Legal</p>
            <p className="text-sm text-yellow-700 mt-1">
                Este é um resumo da licença e não um substituto.
                <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.pt" target="_blank" rel="noreferrer" className="underline ml-1 font-bold">Consulte o código legal completo.</a>
            </p>
        </div>

        <div className="space-y-10 text-slate-700 leading-relaxed">
            <section>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Scale className="text-blue-600"/> Você tem a liberdade de:
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                        <strong className="text-slate-900 text-lg block mb-2">Compartilhar</strong> 
                        Copiar e redistribuir o material em qualquer suporte ou formato.
                    </div>
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                         <strong className="text-slate-900 text-lg block mb-2">Adaptar</strong> 
                         Remixar, transformar, e criar a partir do material.
                    </div>
                </div>
                <p className="mt-4 text-sm italic text-slate-500 border-l-2 border-slate-300 pl-4">
                    O licenciante não pode revogar estas liberdades desde que você respeite os termos da licença.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600"/> De acordo com os seguintes termos:
                </h2>
                <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-slate-100 rounded-full"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" className="w-8 h-8 opacity-80"/></div>
                        <div>
                            <strong className="text-slate-900 text-lg block">Atribuição</strong>
                            Você deve dar o crédito apropriado, prover um link para a licença e indicar se mudanças foram feitas. Você deve fazê-lo em qualquer circunstância razoável, mas de nenhuma maneira que sugira que o licenciante apoia você ou o seu uso.
                        </div>
                    </div>
                     <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-slate-100 rounded-full"><img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" className="w-8 h-8 opacity-80"/></div>
                        <div>
                            <strong className="text-slate-900 text-lg block">NãoComercial</strong>
                            Você não pode usar o material para fins comerciais.
                        </div>
                    </div>
                     <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-slate-100 rounded-full"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" className="w-8 h-8 opacity-80"/></div>
                        <div>
                            <strong className="text-slate-900 text-lg block">CompartilhaIgual</strong>
                            Se você remixar, transformar, ou criar a partir do material, tem de distribuir as suas contribuições sob a mesma licença que o original.
                        </div>
                    </div>
                     <div className="flex gap-4 items-start">
                        <div className="shrink-0 p-2 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center font-bold text-slate-500 text-xl">Ø</div>
                        <div>
                            <strong className="text-slate-900 text-lg block">Sem restrições adicionais</strong>
                            Você não pode aplicar termos jurídicos ou medidas de caráter tecnológico que restrinjam legalmente outros de fazerem algo que a licença permita.
                        </div>
                    </div>
                </div>
            </section>

             <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Avisos importantes</h2>
                <ul className="list-disc pl-5 space-y-3 text-sm md:text-base">
                    <li>Você não tem de cumprir com a licença para elementos do material no domínio público ou onde a sua utilização for permitida por uma exceção ou limitação aplicável.</li>
                    <li>Não são dadas quaisquer garantias. A licença pode não lhe dar todas as permissões necessárias para o uso pretendido. Por exemplo, outros direitos, como publicidade, privacidade ou direitos morais, podem limitar o uso do material.</li>
                </ul>
            </section>
        </div>
        
        <div className="mt-12 text-center pt-8 border-t border-slate-100">
             <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                <ExternalLink size={16}/> Visualizar Licença Original
             </a>
        </div>
    </div>
  );
};

export default LicenseView;