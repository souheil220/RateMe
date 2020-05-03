$(document).ready(function(){
    $('#register').on('click',function(){
        var name = $.trim($('#name').val());
        var address = $.trim($('#address').val());
        var city = $.trim($('#city').val());
        var country = $.trim($('#country').val());
        var sector = $.trim($('#sector').val());
        var website = $.trim($('#website').val());
        var img = $.trim($('#upload-input').val());

        var isValid = true;

        if(name==''){
            isValid = false;
            $('#errorMsg1').html('<div class="alert alert-danger">Name Field is Empty</div>');
        }else{
            $('#errorMsg1').html('');
        }

        if(address==''){
            isValid = false;
            $('#errorMsg2').html('<div class="alert alert-danger">address Field is Empty</div>');
        }else{
            $('#errorMsg2').html('');
        }

        if(city==''){
            isValid = false;
            $('#errorMsg3').html('<div class="alert alert-danger">city Field is Empty</div>');
        }else{
            $('#errorMsg3').html('');
        }

        if(country==''){
            isValid = false;
            $('#errorMsg4').html('<div class="alert alert-danger">country Field is Empty</div>');
        }else{
            $('#errorMsg4').html('');
        }

        if(sector==''){
            isValid = false;
            $('#errorMsg5').html('<div class="alert alert-danger">sector Field is Empty</div>');
        }else{
            $('#errorMsg5').html('');
        }

        if(website==''){
            isValid = false;
            $('#errorMsg6').html('<div class="alert alert-danger">Website Field is Empty</div>');
        }else{
            $('#errorMsg6').html('');
        }

        if(isValid == true){
                var companyData = {
                    name:name,
                    address:address,
                    city:city,
                    country:country,
                    sector:sector,
                    website:website,
                    img:img,
                };

                $.ajax({
                    url:'/company/create',
                    type:'POST',
                    data:companyData,
                    success:function(data){
                            $('#name').val('');
                            $('#address').val('');
                            $('#city').val('');
                            $('#country').val('');
                            $('#sector').val('');
                            $('#website').val('');
                    }
                })
        }else{
            return false
        }
    })
})