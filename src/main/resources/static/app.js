

//local player data
var mycar=undefined;
var mycarxpos=10;
var mycarypos=10;


//competitors data
var loadedCars=[];
var carsCurrentXPositions=[];
var carsCurrentYPositions=[];
var numberCars;

var stompClient = null;

movex = function(){    
    mycarxpos+=10;
    paintCars();
    stompClient.send("/topic/car"+mycar.number, {}, JSON.stringify({car:mycar.number,xpos:mycarxpos}));
    if (mycarxpos == 100){
        setWinner();
    }
};

setWinner = function(){
        $.ajax({
            url: "races/25/winner",
            type: 'PUT',
            data: JSON.stringify(mycar),
            contentType: "application/json"
        }).then(
                function(){
                    stompClient.send("/topic/winnerIs", {}, JSON.stringify({winner:mycar.number}));
                },
                function(err){
                   alert("err:"+err.responseText);
                }
        );
}



initAndRegisterInServer = function(){
    mycar={number:$("#playerid").val()};
    mycarxpos=10;
    mycarypos=10;
    
    $.ajax({
        url: "races/25/participants",
        type: 'PUT',
        data: JSON.stringify(mycar),
        contentType: "application/json"
    }).then(
            function(){
                alert("Competitor registered successfully! Wait for the other participants to start.");
                connectAndSubscribeToCompetitors();
                //Obtener el total, si son 5 cargar los competidores
               $.get("races/25/participants",
                        function (data) {
                            console.log("DATA" +data.length);
                            numberCars = data.length;
                            //Pintar carritos
                        }
               );
            },
            function(err){
               alert("err:"+err.responseText);
            }
    );
};

var validateTotal = function() {
    if (numberCars == 3){
        //Cargar competidores
        console.log('Ya ahí '+ numberCars + '!!');
        stompClient.send("/topic/competitors", {}, numberCars);
    }
};

loadCompetitorsFromServer = function () {
    if (mycar == undefined) {
        alert('Register your car first!');
    } else {
        $.get("races/25/participants",
                function (data) {
                    loadedCars = data;
                    var carCount = 1;
                    alert("Competitors loaded!");
                    loadedCars.forEach(
                            function (car) {
                                if (car.number != mycar.number) {
                                    carsCurrentXPositions[car.number] = 10;
                                    carsCurrentYPositions[car.number] = 40 * carCount;
                                    carCount++;
                                    newSubscriptions(car);
                                }
                            }
                    );
                    paintCars();
                }
        );
    }

};

function newSubscriptions(car){
    stompClient.subscribe('/topic/car'+car.number, function (data) {
        msgdata=JSON.parse(data.body);
        carsCurrentXPositions[msgdata.car]=msgdata.xpos;
        paintCars();
    });
}


function connectAndSubscribeToCompetitors() {
    var socket = new SockJS('/stompendpoint');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/competitors', function (data) {
            console.log('Connected: ' + frame);
            loadCompetitorsFromServer();
            $(".controls").prop('disabled', false);
    });
    stompClient.subscribe('/topic/winnerIs', function (data) {
        msgdata=JSON.parse(data.body);
        if (msgdata.winner != mycar.number) {
            alert("Sorry, you are a loser!!. The winner is :" + msgdata.winner );
        }else if (msgdata.winner == mycar.number){
            alert("You are the winner!!" );
        }
        //Deshabilitar el botón de MOVE MY CAR
        $(".controls").prop('disabled', true);
    });

    validateTotal();

    });

}

function disconnect() {
    if (stompClient != null) {
        stompClient.disconnect();
    }
    setConnected(false);
    console.log("Disconnected");
}

paintCars=function(){
    canvas=$("#cnv")[0];
    ctx=canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //paint my car
    paint(mycar,mycarxpos,mycarypos,ctx);
    
    //paint competitors cars
    loadedCars.forEach(
            function(car){
                paint(car,carsCurrentXPositions[car.number],carsCurrentYPositions[car.number],ctx);
            }
    );
};


paint=function(car,xposition,yposition,ctx){
    
    var img = new Image;
    img.src = "img/car.png";
    img.onload = function(){        
        ctx.drawImage(img,xposition,yposition); 
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText(""+car.number, xposition+(img.naturalWidth/2), yposition+(img.naturalHeight/2));        
    };    
};



$(document).ready(

        function () {
            console.info('loading script!...');
            //Deshabilitar el botón de MOVE MY CAR
            $(".controls").prop('disabled', true);

            $("#racenum").prop('disabled', true);    
        }
);

