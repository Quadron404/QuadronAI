let history = JSON.parse(localStorage.getItem("quadronHistory")) || [];

function saveMessage(role,text){

history.push({
role:role,
content:text
});

localStorage.setItem("quadronHistory",JSON.stringify(history));

}

function getHistory(){
return history;
}

function clearHistory(){
history=[];
localStorage.removeItem("quadronHistory");
}