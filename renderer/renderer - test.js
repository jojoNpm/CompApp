const tableBody = document.getElementById("tableBody")
const selectionCount = document.getElementById("selectionCount")

let selectedProducts = []

function daysAgo(days){
const d = new Date()
d.setDate(d.getDate()-days)
return d
}

const products = [

{
brand:"Garden Gourmet",
canonical:"Carré Végétal",
name:"Carré Gourmand Tomate Mozza",
site:"Carrefour",
price:2.39,
kg:14.94,
promo:30,
weight:"160g",
updated:1,
url:"#",
history:[15,14.8,14.7,14.6,14.9,14.94]
},

{
brand:"Garden Gourmet",
canonical:"Carré Végétal",
name:"Carré Gourmand Tomate Mozza",
site:"OVS",
price:2.49,
kg:15.56,
promo:0,
weight:"160g",
updated:5,
url:"#",
history:[16,15.8,15.6,15.5]
},

{
brand:"Garden Gourmet",
canonical:"Carré Végétal",
name:"Carré Gourmand Tomate Mozza",
site:"Intermarché",
price:2.29,
kg:14.31,
promo:20,
weight:"160g",
updated:2,
url:"#",
history:[15,14.5,14.4,14.31]
},

{
brand:"HappyVore",
canonical:"Nuggets végétaux",
name:"Nuggets Végétaux",
site:"Carrefour",
price:3.99,
kg:19.95,
promo:0,
weight:"200g",
updated:12,
url:"#",
history:[21,20.5,20,19.95]
},

{
brand:"HappyVore",
canonical:"Nuggets végétaux",
name:"Nuggets Végétaux",
site:"OVS",
price:3.59,
kg:17.95,
promo:10,
weight:"200g",
updated:3,
url:"#",
history:[20,19,18.2,17.95]
},

{
brand:"La Vie",
canonical:"Lardons végétaux",
name:"Lardons Végétaux",
site:"Chronodrive",
price:2.89,
kg:24.08,
promo:0,
weight:"120g",
updated:15,
url:"#",
history:[25,24.5,24.2,24.08]
},

{
brand:"La Vie",
canonical:"Lardons végétaux",
name:"Lardons Végétaux",
site:"Carrefour",
price:2.69,
kg:22.41,
promo:15,
weight:"120g",
updated:4,
url:"#",
history:[24,23.5,23,22.41]
}

]

function updateSelection(){
selectionCount.innerText = selectedProducts.length
}

function getUpdateColor(days){

if(days<=2) return "updateGreen"
if(days<=5) return "updateLight"
if(days<=10) return "updateOrange"

return "updateRed"
}

function render(){

tableBody.innerHTML=""

const brands = {}

products.forEach(p=>{
if(!brands[p.brand]) brands[p.brand]={}
if(!brands[p.brand][p.canonical]) brands[p.brand][p.canonical]=[]
brands[p.brand][p.canonical].push(p)
})

Object.keys(brands).forEach(brand=>{

const brandRow=document.createElement("tr")
brandRow.className="brandRow"
brandRow.innerHTML=`<td colspan="10">${brand}</td>`
tableBody.appendChild(brandRow)

Object.keys(brands[brand]).forEach(canon=>{

const canonRow=document.createElement("tr")
canonRow.className="canonRow"
canonRow.innerHTML=`<td colspan="10">${canon}</td>`
tableBody.appendChild(canonRow)

const group = brands[brand][canon]

const best = Math.min(...group.map(p=>p.kg))

group.forEach(p=>{

const tr=document.createElement("tr")

const bestClass = p.kg==best?"bestPrice":""

tr.innerHTML=`

<td><input type="checkbox"></td>

<td class="name">${p.name}</td>

<td>${p.brand}</td>

<td class="site ${p.site}">${p.site}</td>

<td>
${p.promo?`<span class="promoPrice">${p.price}</span>
<span class="oldPrice">${(p.price/(1-p.promo/100)).toFixed(2)}</span>`:p.price}
</td>

<td class="${bestClass}">${p.kg}</td>

<td>${p.promo?`<span class="promoBadge">-${p.promo}%</span>`:""}</td>

<td>${p.weight}</td>

<td class="update ${getUpdateColor(p.updated)}">${p.updated}j</td>

<td><button class="edit">✎</button></td>
`

tr.onclick=()=>{

if(selectedProducts.includes(p)){
selectedProducts=selectedProducts.filter(x=>x!==p)
tr.classList.remove("selected")
}else{
selectedProducts.push(p)
tr.classList.add("selected")
}

updateSelection()

}

tr.querySelector(".edit").onclick=(e)=>{
e.stopPropagation()
openEdit(p)
}

tableBody.appendChild(tr)

})

})

})

}

function openEdit(p){

document.getElementById("editName").value=p.name
document.getElementById("editBrand").value=p.brand
document.getElementById("editPrice").value=p.price
document.getElementById("editKg").value=p.kg
document.getElementById("editUrl").value=p.url

document.getElementById("editPopup").classList.remove("hidden")

}

document.getElementById("closeEdit").onclick=()=>{
document.getElementById("editPopup").classList.add("hidden")
}

document.querySelector(".graph").onclick=()=>{

if(selectedProducts.length==0)return

const ctx=document.getElementById("priceChart")

const datasets=selectedProducts.map(p=>({

label:p.name+" "+p.site,
data:p.history,
borderWidth:3

}))

new Chart(ctx,{
type:"line",
data:{
labels:["J-10","J-8","J-6","J-4","J-2","Aujourd'hui"],
datasets
}
})

document.getElementById("chartPopup").classList.remove("hidden")

}

document.getElementById("closeChart").onclick=()=>{
document.getElementById("chartPopup").classList.add("hidden")
}

render()