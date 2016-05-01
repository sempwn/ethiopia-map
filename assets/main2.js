        var layout = { //main layout format for plot.ly chart
          title: 'Time-series',
          xaxis: {
            title: 'Time since start of intervention (yrs)',
            showgrid: false,
            zeroline: false
          },
          yaxis: {
            title: 'Prevalence',
            showline: false,
            rangemode: 'tozero',
            autorange: true,
            zeroline: true
          }
        };
      

       $(document).ready(function() {

        tabCounter = 1;
        roundsScenarioCounter = 1;

        $("#set-mda-regimen").click(function(){
          $('#mda-table-box .alert').alert('close');
          var mdaType = $("#mda-form").html();
          var mdaCov = $('#coverage-form').html().replace('%','');
          var warning = false;
          if (mdaType=='IVM + ALB'){
            $("#mdaRegimenRadios1").prop("checked", true);
          }else if(mdaType=='DEC + ALB'){
            $("#mdaRegimenRadios2").prop("checked", true);
          } else {
            var content = $('#new-alert').html();
            var ps = modelParams();
            $('#mda-table-box').append(content);
            $('#mda-table-box .alert').addClass('alert-warning')
                       .append('<strong> Warning! </strong> MDA regimen was not set. Current regimen is '+mdaDrugName(ps['mdaRegimen'])
                        +'. See settings -> MDA tab for details.');
            warning = true;
          }
          $('#MDACoverage').slider('setValue', Number(mdaCov));
          if (warning ==false){
            var content = $('#new-alert').html();
            $('#mda-table-box').append(content);
            $('#mda-table-box .alert').addClass('alert-success')
                      .append('<strong> Success! </strong> MDA parameters set. See settings -> MDA tab for details.');
          }
          
        });
         
         
         $("#test-data").click(function(){
            paramSummary();
            $('#pleaseWaitDialog').modal('show');
            if ($('#model #mutliSimCheckBox').prop('checked')){
              $('#model #multiSimLoading').show();
              multiSimCompute();
            }else{
         
                  setInputParams();
                  var m = new Model(800);
                  m.evolveAndSaves(120.0);
                  console.log('No. rounds: ',m.nRounds());
                  //plot.ly test
                  var mfTs = {
                    x: m.ts,
                    y: m.Ms,
                    type: 'scatter',
                    name: 'microfilariaemia'
                  };
                  var wTs = {
                    x: m.ts,
                    y: m.Ws,
                    type: 'scatter',
                    name: 'antigenaemia'
                  };
                  var l3Ts = {
                    x: m.ts,
                    y: m.Ls,
                    type: 'scatter',
                    name: 'mosquito'
                  };

                  var plotlyData = [mfTs,wTs,l3Ts];
                  layout.title = 'Time Series';
                  Plotly.newPlot('plotlyChart', plotlyData, layout, {displayModeBar: false});

                  //$("#model #test-data-result").html(m);
                  //m.Ws.unshift('worm_burden');
                  //m.Ms.unshift('mf_burden');
                  //m.Ls.unshift('L3');
                  //m.ts.unshift('tx');
                  
                  $('#pleaseWaitDialog').modal('hide');
                  /*c3.generate({
                      bindto: '#chart',
                      data: {
                        xs: {
                          worm_burden: 'tx',
                          mf_burden: 'tx',
                          L3: 'tx'
                          
                        },
                        columns: [
                          m.ts,
                          m.Ws,
                          m.Ms,
                          m.Ls
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
        */
              
            }
          });
         $('#reset-rounds').click(function(){
          
            Plotly.newPlot('boxplotChart',[]);
            roundsScenarioCounter = 1;
            $('#rounds-scenario-accordion').html('');
         });
         $('#run-rounds').click(function() {
          $('#rounds-progress-bar').show();
          $('#roundsTest').show();
          $('#rounds-progress-bar-bar').css('width', 100+'%').attr('aria-valuenow', 100);
          $('#rounds-progress-bar').css('width','0%'); //this is a hack, but seems to work.
          setInputParams();
          params.nMDA = 40; //max number of mda rounds even if doing it six monthly. 
          var maxN = $('#roundSims').val();
          var y0 = [];
          var progression = 0;

          var progress = setInterval(function() 
          {
            
            $('#rounds-progress-bar').css('width',Number(progression*100/maxN)+'%');
            var m = new Model(800);
            m.evolveAndSaves(120.0);
            y0.push(m.nRounds());  
            $('#roundsTest').html(progression*100/maxN + '%');            
            if(progression == maxN) {
              $('#rounds-progress-bar').hide();
              $('#roundsTest').hide();
              clearInterval(progress);
              var boxPlotLayout = { //main layout format for plot.ly chart
                title: 'No. rounds to below 1% microfilariaemia',
                xaxis: {
                  title: '',
                  showgrid: false,
                  zeroline: false
                },
                yaxis: {
                  title: 'No. rounds',
                  showline: false,
                  rangemode: 'tozero',
                  autorange: true,
                  zeroline: true
                }
              };
              var trace1 = {
                y: y0,
                type: 'box',
                name: 'scenario ' + roundsScenarioCounter
              };
              if(roundsScenarioCounter==1){
                Plotly.newPlot('boxplotChart', [trace1],boxPlotLayout, {displayModeBar: false});
              } else {
                Plotly.addTraces('boxplotChart',[trace1]);
              }
              roundsScenarioCounter +=1;
            } else {
              progression += 1;
            }
          }, 10);

          var content = $('#new-scenario-accordian').html();
          $('#rounds-scenario-accordion').append(content);
          $('#rounds-scenario-accordion #headingOne').attr('id','heading'+roundsScenarioCounter);
          $('#rounds-scenario-accordion #heading'+roundsScenarioCounter+' a').attr('href','#collapse'+roundsScenarioCounter)
                                                                              .attr('aria-controls','collapse'+roundsScenarioCounter)
                                                                              .html('Scenario '+roundsScenarioCounter);
          $('#rounds-scenario-accordion #collapseOne').attr('id','collapse'+roundsScenarioCounter);
          $('#collapse'+roundsScenarioCounter).attr('aria-labelledby','heading'+roundsScenarioCounter);                                                                       
          $('#collapse'+roundsScenarioCounter+' .panel-body').html(paramSummaryText(true));

          
                    /*for(var i=0; i<10; i++){
            
            var m = new Model(800);
            m.evolveAndSaves(120.0);
            y0.push(m.nRounds());
            setTimeout(function(){
              $('.progress-bar').css('width', i*100/10+'%').attr('aria-valuenow', i*100/10);
              var trace1 = {
                y: y0,
                type: 'box'
              };
              Plotly.newPlot('boxplotChart', [trace1]);
            }
              ,1000);
          }
          */
          

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

          $('#rounds a').click(function (e) {
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
            var b = $("<li role='presentation' "+tabCounter+"><a href='#model" + tabCounter + "' aria-controls='model' role='tab' data-toggle='tab'><button class='close closeTab' type='button' >x</button>Scenario " + tabCounter + " </a></li>");
            $('#nav-tabs li:last').prev().after(b); 
            $('#model'+ tabCounter +' #plotlyChart').attr('id', 'plotlyChart' + tabCounter);
            $('#model'+ tabCounter +' #chart_mf').attr('id','model_'+ tabCounter +'_chart_mf'); 
            $('#model'+ tabCounter +' #chart_wb').attr('id','model_'+ tabCounter +'_chart_wb'); 
            $('#model'+ tabCounter +' #chart_L3').attr('id','model_'+ tabCounter +'_chart_L3'); 
            $('#model'+ tabCounter +' #multiSim').slider();


            $('#model'+ tabCounter + ' #multiSimSliderDiv').hide();
            $('#model'+ tabCounter + ' #multiSimLoading').hide();

            $( '#model'+ tabCounter + ' #mutliSimCheckBox' ).data( "tabIndex", tabCounter );
            $('#model'+ tabCounter + ' #simulation-title').html('Scenario '+ tabCounter);
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
            $('.nav-tabs a[href="#model' + tabCounter + '"]').tab('show');
            tabCounter++;

          });

          $('#regimen-radio').bind('click', function(){
            
            if ($("input[name=mdaRegimenRadios]:checked").val()==5){
              $('#custom-regimen-sliders').show();

            } else {
              $('#custom-regimen-sliders').hide();
            }
          });

          $('#custom-regimen-sliders').hide();
          $('#Macrofilaricide').slider({});

          $('#Microfilaricide').slider({});

          $('#sysAdherence').slider({});

          $('#brMda').slider({});

          $('#bedNetMda').slider({});
          
          $('#endemicity').slider({
            formatter: function(value) {
              return value + '%';
            }

          });

          $('#roundSims').slider({});

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
          $('#rounds-progress-bar').hide();

          $('#termsModal').modal({show: true,
                                  backdrop: 'static',
                                  keyboard: false
          });


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
            "covN" : $('#bedNetCoverage').val(), "v_to_hR" : $('#insecticideCoverage').val(), 
            "vecCap" : $('#vectorialCapacity').val(), "vecComp" : $('#vectorialCompetence').val(), 
            "vecD" : $('#vectorialDeathRate').val(), "mdaRegimen" : $("input[name=mdaRegimenRadios]:checked").val(),
            "sysComp" : $('#sysAdherence').val(), "rhoBComp" : $('#brMda').val(), "rhoCN"  : $('#bedNetMda').val(),
            "species" : $("input[name=speciesRadios]:checked").val(),
            "macrofilaricide" : $('#Macrofilaricide').val(), "microfilaricide" : $('#Microfilaricide').val()
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
          case "5":
            drug_name = "custom regimen with " + $('#Macrofilaricide').val() + "% macrofilariae reduction, and " + $('#Microfilaricide').val() + "% microfilariae reduction";
        }
        return drug_name
      }
      function paramSummary(tabIndex){
        if (tabIndex===undefined) tabIndex='';
        str = paramSummaryText(false);
        $('#model'+tabIndex+' #parameters-summary').text(str);
        
      }
      function paramSummaryText(noRounds){
        noRounds = typeof noRounds !== 'undefined' ? noRounds : false;
        var params = modelParams(); 
        var str = 'Parameters used in this scenario are : ';
        if(noRounds===false){
          str += (params['mda'])? params['mda'] + ' rounds ' : 'no MDA rounds ';
          if (params['mda']) str += 'of ' + mdaDrugName(params['mdaRegimen']) + ' MDA ';
          
          if (params['mda']) str += (params['mdaSixMonths']=="True")? 'occuring every six months ' : 'occuring annually ';
          str += (params['mda'])? 'with ' + params['coverage'] + '% coverage. ' : '. ';
        } else {
          str += mdaDrugName(params['mdaRegimen']);
          str += (params['mdaSixMonths'])? ' occuring every six months ' : ' occuring annually ';
          str +=  'with ' + params['coverage'] + '% coverage. ';
        }
        str += 'Prevalence of microfilariaemia is on average ' + params['endemicity'] + '%. ';
        
        str += 'Bed-net coverage is ' + params['covN'] + '% and ';
        str += 'insecticide coverage is ' + params['v_to_hR'] + '%. ';
        //str += 'Vectorial capacity is ' + params['vecCap'] + ', ';
        //str += 'vector competence is ' + params['vecComp'] + ' and ';
        //str += 'vector death rate is ' + params['vecD'] + ' relative to baseline.';
        return str;
        
      }

      function multiSimCompute(tabIndex){
        if (tabIndex === undefined) tabIndex='';
                  setInputParams();
                  var m = new Model(800);
                  m.evolveAndSaves(120.0);
                  
                  
                  $("#model"+ tabIndex + " #test-data-result").html(m);
                  //m.Ws.unshift('worm_burden');
                  //m.Ms.unshift('mf_burden');
                  //m.Ls.unshift('L3');
                  //m.ts.unshift('x');
                  
                  $('#pleaseWaitDialog').modal('hide');
                  var firstRunI = Number($('#model'+ tabIndex +' #multiSim').val());
                  $('.progress-bar').css('width', 0+'%').attr('aria-valuenow', 0);
                  var mfTs = {
                    x: m.ts,
                    y: m.Ms,
                    type: 'scatter',
                    name: 'run ' + firstRunI
                  };
                  var wTs = {
                    x: m.ts,
                    y: m.Ws,
                    type: 'scatter',
                    name: 'run ' + firstRunI
                  };
                  var l3Ts = {
                    x: m.ts,
                    y: m.Ls,
                    type: 'scatter',
                    name: 'run ' + firstRunI
                  };
                  var mfLayout = jQuery.extend({},layout);
                  mfLayout.title = 'microfilariaemia';

                  Plotly.newPlot('model_'+ tabIndex +'_chart_mf', [mfTs], mfLayout, {displayModeBar: false});
                  $('#model_'+ tabIndex +'_chart_mf,' +
                    '#model_'+ tabIndex +'_chart_wb,' +
                    '#model_'+ tabIndex +'_chart_L3').on('plotly_beforehover',function(){ //turn off hover events for multi-graphs.
                    return false;
                  });

                  var wLayout = jQuery.extend({},layout);
                  wLayout.title = 'antigenaemia';
                  Plotly.newPlot('model_'+ tabIndex +'_chart_wb', [wTs], wLayout, {displayModeBar: false});
                  var l3Layout = jQuery.extend({},layout);
                  l3Layout.title = 'mosquito';
                  Plotly.newPlot('model_'+ tabIndex +'_chart_L3', [l3Ts], l3Layout, {displayModeBar: false});
                  /*chartMF=c3.generate({
                      bindto: '#model'+ tabIndex +' #chart_mf',
                      data: {
                        x: 'x',
                        columns: [
                          m.ts,
                          m.Ms

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
                          m.ts,
                          m.Ws

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
                          m.ts,
                          m.Ls

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
*/

                  addNewSim($('#model'+ tabIndex +' #multiSim').val()-1,tabIndex,firstRunI);
             
              
      }

      function addNewSim(i,tabIndex,firstRunI){
        if(tabIndex===undefined) tabIndex='';
        if (i>0){

        
                    
                    setInputParams();
                    var m = new Model(800);
                    m.evolveAndSaves(120.0);
                    var mfTs = {
                      x: m.ts,
                      y: m.Ms,
                      type: 'scatter',
                      name: 'run ' + i
                    };
                    var wTs = {
                      x: m.ts,
                      y: m.Ws,
                      type: 'scatter',
                      name: 'run ' + i
                    };
                    var l3Ts = {
                      x: m.ts,
                      y: m.Ls,
                      type: 'scatter',
                      name: 'run ' + i
                    };

                    Plotly.addTraces('model_'+ tabIndex +'_chart_mf', mfTs);
                    Plotly.addTraces('model_'+ tabIndex +'_chart_wb', wTs);
                    Plotly.addTraces('model_'+ tabIndex +'_chart_L3', l3Ts);
                    /*$("#model"+ tabIndex +" #test-data-result").html(m);
                    m.Ws.unshift('worm_burden'+i);
                    m.Ms.unshift('mf_burden'+i);
                    m.Ls.unshift('L3'+i);
                    m.ts.unshift('tx');
                    
                    
                    chartMF.load({
                          columns: [
                            m.Ms
                          ],
                          names: {
                            mf_burden: 'mf burden '+i
                          }
                        });

                    chartWB.load({
                          columns: [
                            m.Ws
                          ],
                          names: {
                            worm_burden: 'worm burden '+i
                          }
                        });

                    chartL3.load({
                          columns: [
                            m.Ls
                          ],
                          names: {
                            L3: 'L3 '+i
                          }
                        });
                        */
                    $('.progress-bar').css('width', (firstRunI-i+1)*100/firstRunI +'%').attr('aria-valuenow', (firstRunI-i+1)*100/firstRunI);
                    i--;
                    setTimeout(function () {
                        addNewSim(i,tabIndex,firstRunI);
                    },500);
                    
                
                
          
        } else {
          $('#model'+tabIndex+' #multiSimLoading').hide();
        }

      }

      function runSimulation(tabIndex){

            paramSummary(tabIndex);
            //$('#pleaseWaitDialog').modal('show');
            if ($('#model'+tabIndex+' #mutliSimCheckBox').prop('checked')){
              $('#model'+tabIndex+' #multiSimLoading').show();
              multiSimCompute(tabIndex);
            }else{
              
              
                  setInputParams();
                  var m = new Model(800);
                  m.evolveAndSaves(120.0);
                  var mfTs = {
                    x: m.ts,
                    y: m.Ms,
                    type: 'scatter',
                    name: 'microfilariaemia'
                  };
                  var wTs = {
                    x: m.ts,
                    y: m.Ws,
                    type: 'scatter',
                    name: 'antigenaemia'
                  };
                  var l3Ts = {
                    x: m.ts,
                    y: m.Ls,
                    type: 'scatter',
                    name: 'mosquito'
                  };

                  var plotlyData = [mfTs,wTs,l3Ts];
                  layout.title = 'Time Series';
                  Plotly.newPlot('plotlyChart'+tabIndex, plotlyData, layout, {displayModeBar: false});
                  /*$("#model"+ tabIndex +" #test-data-result").html(m);
                  m.Ws.unshift('worm_burden');
                  m.Ms.unshift('mf_burden');
                  m.Ls.unshift('L3');
                  m.ts.unshift('tx');
                  
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
                          m.ts,
                          m.Ws,
                          m.Ms,
                          m.Ls
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
                  }); */
              
            }

      }

     
