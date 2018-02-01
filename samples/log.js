function log(msg) {
    try
    {
        document.getElementById('out').innerHTML = '<div>' + msg + '</div>';
    }
    catch(e){
        alert(e);
    }
}
