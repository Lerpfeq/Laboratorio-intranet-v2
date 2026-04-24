'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EtiquetaReagente from '@/components/EtiquetaReagente';

interface Reagent {
  id: string;
  nome: string;
  marca: string | null;
  volume: string | null;
  localidade: string | null;
  status: string;
  entradas: {
    codigoInterno: string;
    dataValidade: string | null;
    localizacao: string | null;
    categoria?: string | null;
    concentracao?: string | null;
  }[];
}

const categoryCodes: Record<string,string> = {
  'Ácidos':'A',
  'Bases':'B',
  'Solventes':'S',
  'Sais/Inorgânicos':'I',
  'Monômeros':'M',
  'Biopolímeros':'P',
  'Reticulantes':'R',
  'Catalisadores':'C',
  'Fotoiniciadores':'F',
  'Oxidantes/Redutores':'O',
  'Nanomateriais':'N',
  'Analíticos':'L',
  'Controlados':'X',
  'Microbiológicos':'K'
};

function suggestStorage(categoria:string,nome:string,storageCondition:string){
 const n=(nome||'').toLowerCase();
 if(n.includes('thiol') || n.includes('mercapto') || n.includes('dithiol')) return 'Thiol Cabinet Shelf 1';
 if(storageCondition==='Refrigerado') return 'Refrigerator';
 if(storageCondition==='Congelado') return 'Freezer';
 if(storageCondition==='Micro refrigerado') return 'Microbiology Fridge';
 if(storageCondition==='Inflamável') return 'Flammables Cabinet Shelf 1';
 if(categoria==='Microbiológicos') return 'Cabinet 4 Shelf 1';
 const rules:Record<string,string>={
 'Ácidos':'Cabinet 1 Shelf 1',
 'Bases':'Cabinet 1 Shelf 2',
 'Sais/Inorgânicos':'Cabinet 2 Shelf 1',
 'Oxidantes/Redutores':'Cabinet 2 Shelf 2',
 'Biopolímeros':'Cabinet 3 Shelf 1',
 'Catalisadores':'Cabinet 3 Shelf 2',
 'Monômeros':'Cabinet 5 Shelf 1',
 'Reticulantes':'Cabinet 5 Shelf 2',
 'Solventes':'Flammables Cabinet Shelf 1'
 }
 return rules[categoria] || 'Custom Storage';
}

export default function ReagentesPage(){
 const {data:session,status}=useSession()||{};
 const router=useRouter();
 const [reagentes,setReagentes]=useState<Reagent[]>([]);
 const [loading,setLoading]=useState(true);
 const [tab,setTab]=useState('consulta');
 const [user,setUser]=useState<any>(null);

 useEffect(()=>{
   if(status==='unauthenticated') router.replace('/login');
 },[status,router]);

 useEffect(()=>{
   if(session?.user?.id) fetchUserAndReagentes();
 },[session]);

 const fetchUserAndReagentes=async()=>{
  try{
   const userRes=await fetch('/api/auth/me');
   if(userRes.ok) setUser(await userRes.json());
   const reagentesRes=await fetch('/api/reagentes');
   if(reagentesRes.ok) setReagentes(await reagentesRes.json());
  }catch(e){console.error(e)}
  finally{setLoading(false)}
 }

 if(status==='loading'||loading) return <div style={{padding:'2rem'}}>Loading...</div>;

 const isAdmin=user?.category==='Admin';
 const isPosGraduando=user?.category==='Pos-graduando';

 return (
 <div>
<header className='header'>
<div className='header-container'>
<div className='logo-section'>
<div style={{position:'relative',width:'40px',height:'40px'}}>
<Image src='/logo.png' alt='LERP Logo' fill style={{objectFit:'contain'}}/>
</div>
<div className='logo-text'><h1>LERP</h1></div>
</div>
<nav className='nav-tabs'>
<Link href='/dashboard'>Dashboard</Link>
<Link href='/reagentes'>Reagents</Link>
</nav>
<div className='user-menu'>
<span>{user?.name}</span>
<button onClick={()=>router.push('/api/auth/signout')}>Log out</button>
</div>
</div>
</header>

<main className='container'>
<h2 className='page-title'>Reagent Management</h2>
{(isAdmin||isPosGraduando)&&(
<div style={{marginBottom:'2rem',display:'flex',gap:'1rem',borderBottom:'2px solid #ddd'}}>
<button onClick={()=>setTab('consulta')}>Check Inventory</button>
<button onClick={()=>setTab('entrada')}>Reagent Input</button>
<button onClick={()=>setTab('saida')}>Reagent Output</button>
</div>
)}

{tab==='consulta' && <ConsultaReagentes/>}
{tab==='entrada' && (isAdmin||isPosGraduando) && <EntradaForm onSuccess={fetchUserAndReagentes}/>}
{tab==='saida' && (isAdmin||isPosGraduando) && <SaidaForm reagentes={reagentes} onSuccess={fetchUserAndReagentes}/>}
</main>
</div>
 )
}

function ConsultaReagentes(){
const [reagentes,setReagentes]=useState<any[]>([]);
const [loading,setLoading]=useState(false);
const [filtros,setFiltros]=useState({nome:'',marca:''});

useEffect(()=>{fetchReagentes()},[])

const fetchReagentes=async(nome='',marca='')=>{
setLoading(true)
try{
const params=new URLSearchParams();
if(nome) params.append('nome',nome)
if(marca) params.append('marca',marca)
const res=await fetch(`/api/reagentes/consulta?${params.toString()}`)
if(res.ok) setReagentes(await res.json())
}catch(e){console.error(e)}
finally{setLoading(false)}
}

const handleFilterChange=(field:string,value:string)=>{
const novos={...filtros,[field]:value}
setFiltros(novos)
fetchReagentes(novos.nome,novos.marca)
}

return <div>
<h3>Inventory Search</h3>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
<input value={filtros.nome} onChange={e=>handleFilterChange('nome',e.target.value)} placeholder='Filter by reagent name'/>
<input value={filtros.marca} onChange={e=>handleFilterChange('marca',e.target.value)} placeholder='Filter by brand'/>
</div>
{loading?<div>Loading...</div>:reagentes.length===0?<div>No results found</div>:
<table className='table'>
<thead><tr><th>Name</th><th>Brand</th><th>Internal Code</th><th>Category</th><th>Concentration</th><th>Location</th><th>Expiry</th><th>Status</th></tr></thead>
<tbody>
{reagentes.map(r=>{
const u=r.entradas?.[0]
return <tr key={r.id}>
<td>{r.nome}</td><td>{r.marca||'-'}</td><td>{u?.codigoInterno||'-'}</td>
<td>{u?.categoria||'-'}</td><td>{u?.concentracao||'-'}</td><td>{u?.localizacao||'-'}</td>
<td>{u?.dataValidade?new Date(u.dataValidade).toLocaleDateString('en-US'):'-'}</td>
<td>{r.status}</td>
</tr>
})}
</tbody></table>}
</div>
}

function EntradaForm({onSuccess}:{onSuccess:()=>void}){
const vazio={
nome:'',marca:'',volume:'',localidade:'',fornecedor:'',notaFiscal:'',quantidade:1,
dataEntrada:new Date().toISOString().split('T')[0],categoria:'',concentracao:'',dataValidade:'',perigos:'',responsavel:'',storageCondition:'Ambiente'
}
const [batchItems,setBatchItems]=useState<any[]>([vazio]);
const [loading,setLoading]=useState(false);
const [etiquetas,setEtiquetas]=useState<any[]|null>(null);
const [manualLocation,setManualLocation]=useState(false);

const updateItem=(idx:number,campo:string,valor:any)=>{
 const copia=[...batchItems];
 copia[idx][campo]=valor;
 if(campo==='categoria' || campo==='storageCondition' || campo==='nome'){
   if(!manualLocation){
    copia[idx].localidade=suggestStorage(copia[idx].categoria,copia[idx].nome,copia[idx].storageCondition)
   }
 }
 setBatchItems(copia)
}

const addItem=()=>setBatchItems([...batchItems,{...vazio}])
const removeItem=(i:number)=>setBatchItems(batchItems.filter((_,idx)=>idx!==i))

const previewLabels=useMemo(()=>{
const labels:any[]=[]
batchItems.forEach(item=>{
 for(let i=0;i<Number(item.quantidade||1);i++){
   labels.push(item)
 }
})
return labels
},[batchItems])

const handleSubmit=async(e:any)=>{
e.preventDefault();
setLoading(true)
try{
const res=await fetch('/api/reagentes/batch',{
method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batchItems)
})
if(res.ok){
 const data=await res.json().catch(()=>previewLabels)
 setEtiquetas(Array.isArray(data)?data:previewLabels)
 onSuccess()
}
}catch(e){console.error(e)}
finally{setLoading(false)}
}

if(etiquetas){
return <div>
<h3>Generated Labels</h3>
<div className='a4-sheet'>
{etiquetas.map((e,i)=><div key={i} className='label-box'><EtiquetaReagente entrada={e} logoUrl='/logo.png'/></div>)}
</div>
<button onClick={()=>window.print()}>Print A4 Labels</button>
<button onClick={()=>setEtiquetas(null)}>Back</button>
<style jsx>{`
@media print{
.a4-sheet{display:grid;grid-template-columns:repeat(2,1fr);gap:8mm;width:210mm}
.label-box{break-inside:avoid}
}
`}</style>
</div>
}

return <form onSubmit={handleSubmit}>
<h3>Batch Reagent Entry</h3>
<label>
<input type='checkbox' checked={manualLocation} onChange={()=>setManualLocation(!manualLocation)}/>
 Use manual storage location
</label>

{batchItems.map((item,idx)=>(
<div key={idx} style={{border:'1px solid #ddd',padding:'1rem',marginBottom:'1rem'}}>
<h4>Reagent {idx+1}</h4>
<input placeholder='Reagent Name' value={item.nome} onChange={e=>updateItem(idx,'nome',e.target.value)} />
<input placeholder='Brand' value={item.marca} onChange={e=>updateItem(idx,'marca',e.target.value)} />
<input placeholder='Volume' value={item.volume} onChange={e=>updateItem(idx,'volume',e.target.value)} />

<select value={item.categoria} onChange={e=>updateItem(idx,'categoria',e.target.value)}>
<option value=''>Select Category</option>
<option>Solventes</option><option>Ácidos</option><option>Bases</option><option>Sais/Inorgânicos</option>
<option>Monômeros</option><option>Biopolímeros</option><option>Reticulantes</option><option>Catalisadores</option>
<option>Fotoiniciadores</option><option>Oxidantes/Redutores</option><option>Nanomateriais</option><option>Analíticos</option>
<option>Controlados</option><option>Microbiológicos</option>
</select>

<select value={item.storageCondition} onChange={e=>updateItem(idx,'storageCondition',e.target.value)}>
<option>Ambiente</option>
<option>Refrigerado</option>
<option>Congelado</option>
<option>Micro refrigerado</option>
<option>Inflamável</option>
</select>

{manualLocation && (
<select value={item.localidade} onChange={e=>updateItem(idx,'localidade',e.target.value)}>
<option>Custom Storage</option><option>Cabinet 1 Shelf 1</option><option>Cabinet 1 Shelf 2</option>
<option>Cabinet 2 Shelf 1</option><option>Cabinet 2 Shelf 2</option>
<option>Cabinet 3 Shelf 1</option><option>Cabinet 3 Shelf 2</option>
<option>Cabinet 4 Shelf 1</option><option>Cabinet 5 Shelf 1</option><option>Cabinet 5 Shelf 2</option>
<option>Thiol Cabinet Shelf 1</option><option>Thiol Cabinet Shelf 2</option>
<option>Flammables Cabinet Shelf 1</option><option>Flammables Cabinet Shelf 2</option>
<option>Refrigerator</option><option>Freezer</option><option>Microbiology Fridge</option>
</select>
)}

{!manualLocation && <div><strong>Suggested Location:</strong> {item.localidade||'-'}</div>}
<div><strong>Internal Code Preview:</strong> LERP-{categoryCodes[item.categoria]||'?'}####</div>

<input placeholder='Supplier' value={item.fornecedor} onChange={e=>updateItem(idx,'fornecedor',e.target.value)} />
<input placeholder='Concentration' value={item.concentracao} onChange={e=>updateItem(idx,'concentracao',e.target.value)} />
<input type='date' value={item.dataValidade} onChange={e=>updateItem(idx,'dataValidade',e.target.value)} />
<input type='number' min='1' value={item.quantidade} onChange={e=>updateItem(idx,'quantidade',e.target.value)} />

{batchItems.length>1 && <button type='button' onClick={()=>removeItem(idx)}>Remove</button>}
</div>
))}

<button type='button' onClick={addItem}>+ Add Reagent</button>
<button type='submit' disabled={loading}>{loading?'Processing...':'Generate Labels & Register'}</button>
<div><strong>Labels to print:</strong> {previewLabels.length}</div>
</form>
}

function SaidaForm({reagentes,onSuccess}:{reagentes:Reagent[];onSuccess:()=>void}){
const [codigoInterno,setCodigoInterno]=useState('');
const [loading,setLoading]=useState(false);
const [message,setMessage]=useState('');
const reagentesComCodigo=reagentes.filter(r=>r.entradas?.[0]?.codigoInterno)

const handleSubmit=async(e:any)=>{
e.preventDefault();
const r=reagentesComCodigo.find(x=>x.entradas[0].codigoInterno===codigoInterno)
if(!r){setMessage('Select a valid internal code'); return}
if(!window.confirm(`Remove ${r.nome} (${codigoInterno})?`)) return;
setLoading(true)
try{
const res=await fetch('/api/reagentes/saida',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codigoInterno})})
if(res.ok){setMessage('Reagent removed successfully'); setCodigoInterno(''); onSuccess()}
}catch(e){setMessage('Error processing output')}
finally{setLoading(false)}
}

return <form onSubmit={handleSubmit}>
<h3>Reagent Output</h3>
<select value={codigoInterno} onChange={e=>setCodigoInterno(e.target.value)}>
<option value=''>Select Internal Code</option>
{reagentesComCodigo.map(r=><option key={r.id} value={r.entradas[0].codigoInterno}>{r.entradas[0].codigoInterno} — {r.nome}</option>)}
</select>
<button disabled={loading}>{loading?'Removing...':'Confirm Output'}</button>
{message && <div>{message}</div>}
</form>
}
```

