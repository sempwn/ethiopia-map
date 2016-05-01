
       $(document).ready(function() {

         tabCounter = 1;

         $("#generate-string").click(function(e) {
           $.post("/generator", {"length": $("input[name='length']").val()})
            .done(function(string) {
               $("#the-string").show();
               $("#the-string input").val(string);
            });
           e.preventDefault();
         });

         $("#replace-string").click(function(e) {
           $.ajax({
              type: "PUT",
              url: "/generator",
              data: {"another_string": $("#the-string").val()}
           })
           .done(function() {
              alert("Replaced!");
           });
           e.preventDefault();
         });

         $("#delete-string").click(function(e) {
           $.ajax({
              type: "DELETE",
              url: "/generator"
           })
           .done(function() {
              $("#the-string").hide();
           });
           e.preventDefault();
         });
         
         
         $("#test-data").click(function(){
            paramSummary();
            $('#pleaseWaitDialog').modal('show');
            if ($('#model #mutliSimCheckBox').prop('checked')){
              $('#model #multiSimLoading').show();
              multiSimCompute();
            }else{
              $.post(
              "/test_data",
              modelParams(),
              function(simResult){
                  
                  response = jQuery.parseJSON(simResult);
                  $("#model #test-data-result").html(response);
                  response.wM.unshift('worm_burden');
                  response.mfM.unshift('mf_burden');
                  response.lM.unshift('L3');
                  response.tx.unshift('tx');
                  
                  $('#pleaseWaitDialog').modal('hide');
                  c3.generate({
                      bindto: '#chart',
                      data: {
                        xs: {
                          worm_burden: 'tx',
                          mf_burden: 'tx',
                          L3: 'tx'
                          
                        },
                        columns: [
                          response.tx,
                          response.wM,
                          response.mfM,
                          response.lM
                        ],
                        names: {
                          worm_burden: 'Worm burden',
                          mf_burden: 'mf burden',
                          L3: 'L3 density'
                        }
                      },
                       axis: {
                        x: {
                          label: 'time (years)',
                          tick: {
                            fit: false
                          }
                        },
                        y: {
                          label: 'Prevalence',
                          min: 0
                        }
                      },
                      legend: {
                        position: 'right'
                      },
                      tooltip: {
                        format: {
                          title: function (d) { return 'Year ' + d; }
           
//            value: d3.format(',') // apply this format to both y and y2
                        }
                      },
                      type: 'spline'
                  });
              });
            }
          });
         
         $('#home a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#vector a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#mda a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#model a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#adherence a').click(function (e){
            e.preventDefault();
            $(this).tab('show');
          });

          $('#test a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#plus').click(function(){
            var a = $("<div role='tabpanel' class='tab-pane' id='model" + tabCounter + "'></div>");
            var content = $('#new-tab').html();
            $('.tab-content').append(a); 
            $('div.tab-pane#model'+tabCounter).html(content);
            var b = $("<li role='presentation' "+tabCounter+"><a href='#model" + tabCounter + "' aria-controls='model' role='tab' data-toggle='tab'><button class='close closeTab' type='button' >×</button>Model " + tabCounter + " </a></li>");
            $('#nav-tabs li:last').prev().after(b);   
            $('#model'+ tabCounter +' #multiSim').slider();


            $('#model'+ tabCounter + ' #multiSimSliderDiv').hide();
            $('#model'+ tabCounter + ' #multiSimLoading').hide();

            $( '#model'+ tabCounter + ' #mutliSimCheckBox' ).data( "tabIndex", tabCounter );
            $('#model'+ tabCounter +' #mutliSimCheckBox').bind('click',function(){

              var d = $(this).data()['tabIndex'];
              toggle('#model'+ d + ' .multiSimGroup', this); 
              toggleOff('#model'+ d + ' .singleSimGroup',this);
            });
            
            $( '#model'+ tabCounter + ' #test-data' ).data( "tabIndex", tabCounter );
            $('#model'+ tabCounter + ' #test-data').bind('click',function(){
              var d = $(this).data();
              runSimulation(d['tabIndex']);
            });

            $(".closeTab").bind('click',
              function () {

              //there are multiple elements which has .closeTab icon so close the tab whose close icon is clicked
              var tabContentId = $(this).parent().attr("href");
              $(this).parent().parent().remove(); //remove li of tab
              $('#myTab a:last').tab('show'); // Select first tab
              $(tabContentId).remove(); //remove respective tab content

            });

            $( 'a#model'+ tabCounter + " button").data( "tabIndex", tabCounter );
            tabCounter++;

          });

          $('#sysAdherence').slider({});

          $('#brMda').slider({});

          $('#bedNetMda').slider({});
          
          $('#endemicity').slider({});

          $('#MDACoverage').slider({
            formatter: function(value) {
              return value + '%';
            }
          });

          $('#bedNetCoverage').slider({
            formatter: function(value) {
              return value + '%';
            }
          });

          $('#insecticideCoverage').slider({
            formatter: function(value) {
              return value + '%';
            }
          });

          $('#multiSim').slider();
          $('#vectorialCapacity').slider();
          $('#vectorialCompetence').slider();
          $('#vectorialDeathRate').slider();

          $('#multiSimSliderDiv').hide();
          $('#multiSimLoading').hide();
       });

      function toggle(className, obj) {
            var $input = $(obj);
            if ($input.prop('checked')) $(className).show();
            else $(className).hide();
      }

      function toggleOff(className, obj) {
            var $input = $(obj);
            if ($input.prop('checked')) $(className).hide();
            else $(className).show();
      }

      function modelParams(){
        return {"mda" : $("#inputMDARounds").val(), "mdaSixMonths" : $("input:radio[name=mdaSixMonths]:checked").val(), 
            "endemicity" : $('#endemicity').val(), "coverage": $("#MDACoverage").val(),
            "lbdaR" : $('#bedNetCoverage').val(), "v_to_hR" : $('#insecticideCoverage').val(), 
            "vecCap" : $('#vectorialCapacity').val(), "vecComp" : $('#vectorialCompetence').val(), 
            "vecD" : $('#vectorialDeathRate').val(), "mdaRegimen" : $("input[name=mdaRegimenRadios]:checked").val(),
            "sysComp" : $('#sysAdherence').val(), "rhoBComp" : $('#brMda').val(), "rhoCN"  : $('#bedNetMda').val(),
            "species" : $("input[name=speciesRadios]:checked").val()
          }
      }

      function mdaDrugName(str){
        var drug_name =""
        switch(str){
          case "1":
            drug_name = "albendazole + ivermectin";
            break;
          case "2":
            drug_name = "albendazole + diethylcarbamazine";
            break;
          case "3":
            drug_name = "ivermectin";
            break;
          case "4":
            drug_name = "ivermectin + diethylcarbamazine + albendazole";
            break;
        }
        return drug_name
      }
      function paramSummary(tabIndex){
        if (tabIndex===undefined) tabIndex='';
        var params = modelParams(); 
        var str = 'Parameters used in this scenario are : ';
        str += mdaDrugName(params['mdaRegimen']) + ' of ';
        str += (params['mda'])? 'MDA : ' + params['mda'] + ' rounds ' : 'no MDA rounds ';
        str += (params['mdaSixMonths'])? 'occuring every six months ' : 'occuring annually ';
        str += 'with ' + params['coverage'] + '% coverage. ';
        str += 'Endemicity is at ' + params['endemicity'] + '. ';
        
        str += 'Bed-net coverage is ' + params['lbdaR'] + '% and ';
        str += 'insecticide coverage is ' + params['v_to_hR'] + '%. ';
        str += 'Vectorial capacity is ' + params['vecCap'] + ', ';
        str += 'vector competence is ' + params['vecComp'] + ' and ';
        str += 'vector death rate is ' + params['vecD'] + ' relative to baseline.';
        $('#model'+tabIndex+' #parameters-summary').text(str);
        
      }

      function multiSimCompute(tabIndex){
        if (tabIndex === undefined) tabIndex='';
        $.ajax({
              type: 'POST',
              url: "/test_data",
              data: modelParams(),
              success: function(simResult){
                  
                  response = jQuery.parseJSON(simResult);
                  $("#model"+ tabIndex + " #test-data-result").html(response);
                  response.wM.unshift('worm_burden');
                  response.mfM.unshift('mf_burden');
                  response.lM.unshift('L3');
                  response.tx.unshift('x');
                  
                  $('#pleaseWaitDialog').modal('hide');
                  chartMF=c3.generate({
                      bindto: '#model'+ tabIndex +' #chart_mf',
                      data: {
                        x: 'x',
                        columns: [
                          response.tx,
                          response.mfM

                        ],
                        names: {
                          mf_burden: 'mf burden'

                        }
                      },
                       axis: {
                        x: {
                          label: 'time (years)',
                          tick: {
                            fit: false
                          }
                        },
                        y: {
                          label: 'Prevalence',
                          min: 0
                        }
                      },
                      legend: {
                        position: 'right'
                      },
                      zoom: {
                        enabled: true
                      },
                      tooltip: {
                        format: {
                          title: function (d) { return 'Year ' + d; }
           
//            value: d3.format(',') // apply this format to both y and y2
                        }
                      },
                      type: 'spline'
                  });

                  chartWB=c3.generate({
                      bindto: '#model'+ tabIndex +' #chart_wb',
                      data: {
                        x: 'x',
                        columns: [
                          response.tx,
                          response.wM

                        ],
                        names: {
                          worm_burden: 'worm burden'

                        }
                      },
                       axis: {
                        x: {
                          label: 'time (years)',
                          tick: {
                            fit: false
                          }
                        },
                        y: {
                          label: 'Prevalence',
                          min: 0
                        }
                      },
                      legend: {
                        position: 'right'
                      },
                      zoom: {
                        enabled: true
                      },
                      tooltip: {
                        format: {
                          title: function (d) { return 'Year ' + d; }
           
//            value: d3.format(',') // apply this format to both y and y2
                        }
                      },
                      type: 'spline'
                  });

                  chartL3=c3.generate({
                      bindto: '#model'+ tabIndex +' #chart_L3',
                      data: {
                        x: 'x',
                        columns: [
                          response.tx,
                          response.lM

                        ],
                        names: {
                          worm_burden: 'L3'

                        }
                      },
                       axis: {
                        x: {
                          label: 'time (years)',
                          tick: {
                            fit: false
                          }
                        },
                        y: {
                          label: 'Prevalence',
                          min: 0
                        }
                      },
                      legend: {
                        position: 'right'
                      },
                      zoom: {
                        enabled: true
                      },
                      tooltip: {
                        format: {
                          title: function (d) { return 'Year ' + d; }
           
//            value: d3.format(',') // apply this format to both y and y2
                        }
                      },
                      type: 'spline'
                  });

                  addNewSim($('#model'+ tabIndex +' #multiSim').val(),tabIndex);
              },
              async: true
              });
              
      }

      function addNewSim(i,tabIndex){
        if(tabIndex===undefined) tabIndex='';
        if (i>0){
          $.ajax({
                type: "POST",
                url: "/test_data",
                data: modelParams(),
                success: function(simResult){
                    
                    response = jQuery.parseJSON(simResult);
                    $("#model"+ tabIndex +" #test-data-result").html(response);
                    response.wM.unshift('worm_burden'+i);
                    response.mfM.unshift('mf_burden'+i);
                    response.lM.unshift('L3'+i);
                    response.tx.unshift('tx');
                    
                    
                    chartMF.load({
                          columns: [
                            response.mfM
                          ],
                          names: {
                            mf_burden: 'mf burden '+i
                          }
                        });

                    chartWB.load({
                          columns: [
                            response.wM
                          ],
                          names: {
                            worm_burden: 'worm burden '+i
                          }
                        });

                    chartL3.load({
                          columns: [
                            response.lM
                          ],
                          names: {
                            L3: 'L3 '+i
                          }
                        });

                    i--;
                    addNewSim(i,tabIndex);
                },
                async: true
                });
          
        } else {
          $('#model'+tabIndex+' #multiSimLoading').hide();
        }

      }

      function runSimulation(tabIndex){
        window.alert('clicked the button for tab '+tabIndex+'!');
            paramSummary(tabIndex);
            $('#pleaseWaitDialog').modal('show');
            if ($('#model'+tabIndex+' #mutliSimCheckBox').prop('checked')){
              $('#model'+tabIndex+' #multiSimLoading').show();
              multiSimCompute(tabIndex);
            }else{
              $.post(
              "/test_data",
              modelParams(),
              function(simResult){
                  
                  response = jQuery.parseJSON(simResult);
                  $("#model"+ tabIndex +" #test-data-result").html(response);
                  response.wM.unshift('worm_burden');
                  response.mfM.unshift('mf_burden');
                  response.lM.unshift('L3');
                  response.tx.unshift('tx');
                  
                  $('#pleaseWaitDialog').modal('hide');
                  c3.generate({
                      bindto: '#model'+tabIndex+' #chart',
                      data: {
                        xs: {
                          worm_burden: 'tx',
                          mf_burden: 'tx',
                          L3: 'tx'
                          
                        },
                        columns: [
                          response.tx,
                          response.wM,
                          response.mfM,
                          response.lM
                        ],
                        names: {
                          worm_burden: 'Worm burden',
                          mf_burden: 'mf burden',
                          L3: 'L3 density'
                        }
                      },
                       axis: {
                        x: {
                          label: 'time (years)',
                          tick: {
                            fit: false
                          }
                        },
                        y: {
                          label: 'Prevalence',
                          min: 0
                        }
                      },
                      legend: {
                        position: 'right'
                      },
                      zoom: {
                        enabled: true
                      },
                      type: 'spline'
                  });
              });
            }

      }

     
