document.addEventListener("DOMContentLoaded",()=>{

const tableBody = document.getElementById("products-body")
const selectionCount = document.getElementById("selectionCount")
let selectedProducts=[]

function formatPrice(p){
if(!p) return "N/A"
return parseFloat(p).toFixed(2)+" €"
}

function getUpdateColor(days){
if(days<=2) return "updateGreen"
if(days<=5) return "updateLight"
if(days<=10) return "updateOrange"
return "updateRed"
}

function updateSelection(){
selectionCount.innerText = selectedProducts.length
}

// Render tableau
function render(products){
tableBody.innerHTML=""
const brands={}
products.forEach(p=>{
if(!brands[p.brand]) brands[p.brand]={}
if(!brands[p.brand][p.canonicalName||p.canonical]) brands[p.brand][p.canonicalName||p.canonical]=[]
brands[p.brand][p.canonicalName||p.canonical].push(p)
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
        const best = Math.min(...group.map(p=>p.price_per_kg||Infinity))

        group.forEach(p=>{
            const tr=document.createElement("tr")
            const bestClass = p.price_per_kg===best?"bestPrice":""
            tr.innerHTML=`
            <td><input type="checkbox"></td>
            <td class="name">${p.name}</td>
            <td>${p.brand}</td>
            <td class="site ${p.site_name}">${p.site_name}</td>
            <td>
                ${p.promo_price?`<span class="promoPrice">${formatPrice(p.promo_price)}</span>
                <span class="oldPrice">${formatPrice(p.regular_price)}</span>`:formatPrice(p.regular_price)}
            </td>
            <td class="${bestClass}">${p.price_per_kg?formatPrice(p.price_per_kg):"N/A"}</td>
            <td>${p.promo_percent?`<span class="promoBadge">-${p.promo_percent}%</span>`:""}</td>
            <td>${p.weight_raw||""}</td>
            <td class="update ${getUpdateColor(p.updated_days||0)}">${p.updated_days||0}j</td>
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

            tr.querySelector(".edit").onclick=e=>{
                e.stopPropagation()
                document.getElementById("editName").value=p.name
                document.getElementById("editBrand").value=p.brand
                document.getElementById("editPrice").value=p.regular_price
                document.getElementById("editKg").value=p.price_per_kg
                document.getElementById("editUrl").value=p.product_url
                document.getElementById("editPopup").classList.remove("hidden")
            }

            tableBody.appendChild(tr)
        })
    })
})

}

// Chargement
async function loadProducts(){
    const products = await window.api.getProducts()
    render(products)
}
window.rendererLoadProducts = loadProducts
loadProducts()
})