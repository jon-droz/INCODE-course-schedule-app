// ----------EVENT LISTENERY----------------

const day = document.querySelectorAll('.day');

function dayPicker (day) {
const dayName = this.id;
document.querySelectorAll('.schedule_item').forEach(item => {item.style.display = 'none'})
document.querySelectorAll('.day'+ dayName).forEach(item => {item.style.display = "initial"})
}
day.forEach(item => {item.addEventListener('click', dayPicker)})