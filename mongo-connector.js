'use strict';

const fs = require('fs');
const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');
const async = require('async');
mongoose.connect('mongodb://localhost/press-releases');

const entrySchema = mongoose.Schema({
    ent_num:String,
    sdn_name:String,
    sdn_type:String,
    program:String,
    title:String,
    call_sign:String,
    vess_type:String,
    tonnage:String,
    grt:String,
    vess_flag:String,
    vess_owner:String,
    remarks:String,
    linked_to:[String],
    nationality:[String],
    dob:[String],
    aka:String,
    pob:[String],
    passport:[String],
    nit:[String],
    cedula_no:String,
    ssn:String,
    dni:String,
    rfc:[String],
    website:[String],
    vessel_registration_number:String,
    gender:String,
    swift_bic:[String],
    tax_id_no:[String],
    email:[String],
    phone:String,
    registration_id:[String],
    company_number:String,
    aircraft_construction_number:String,
    citizen:[String],
    additional_sanctions_info:[String],
    aircraft_manufacture_date:String,
    aircraft_model:[String],
    aircraft_operator:[String],
    position:String,
    national_id_number:[String],
    identification_number:[String],
    previous_aircraft_tail_number:String
});

const prSchema = mongoose.Schema({
    title:String,
    link:String,
    date:String,
    content:String
});

entrySchema.plugin(mongoosastic);
prSchema.plugin(mongoosastic);

let Entry = mongoose.model('Entry', entrySchema);
let PR = mongoose.model('PR', prSchema);


saveModelOfType(PR);


function saveModelOfType(model) {
    shipFromFile('press_release_json.txt', model);
    sync(model);
}


function sync(model) {
    let stream = model.synchronize();
    var count = 0;

    stream.on('data', (err, doc) => count++);
    stream.on('close', () => console.log('Indexed ' + count + ' document'));
    stream.on('error', (err) => console.log(err));
}


function shipFromFile(filename, model) {
    fs.readFile(filename, 'utf8', (err, data) => {
        let json = JSON.parse(data);
        shipToDB(json, model);
    });
}

function shipToDB(json_data, model) {
    console.log("# keys: " + Object.keys(json_data).length);

    for (var i = 0; i < json_data.length; i++) {
        console.log('Shipping document ' + i);
        let newEntry = new model(json_data[i]);
        newEntry.save((err) => {
            if (err) {
                console.log(err);
            }
        });
    }
}

/* Tony's loadData() method, moved out of app.js */
let parseSdnCsv = () => {
    let json_data = [];
    let csv_headers = ['ent_num', 'sdn_name', 'sdn_type', 'program', 'title', 'call_sign', 'vess_type', 'tonnage', 'grt', 'vess_flag', 'vess_owner', 'remarks']
    // remarks_headers = new Set(['DOB', 'a.k.a.', 'POB', 'Passport', 'SSN', 'NIT', 'Cedula No.', 'D.N.I', 'Linked To:', 'R.F.C.', 'nationality', 'National ID No.', 'Additional Sanctions Information -', 'citizen', 'UK Company Number', 'Website:', 'Website', 'Aircraft Construction', 'Vessel Registration Identification', 'Gender', 'SWIFT/BIC', 'Tax ID No.', 'Email Address', 'Telephone:', 'Phone No.', 'Registration ID', 'Company Number'])
    let remarks_matcher = /(Linked To:|nationality|DOB|a\.k\.a\.|POB|Passport|NIT|Cedula\sNo\.|SSN|D\.N\.I\.|R\.F\.C\.|Website:|Website|Vessel Registration Identification|Gender|SWIFT\/BIC|Tax ID No\.|Email Address|Telephone:|Phone No\.|Registration ID|Company Number|Aircraft Construction Number|citizen|Additional Sanctions Information \-|Aircraft Manufacture Date|Aircraft Model|Aircraft Operator|Position:|National ID No\.|Identification Number|Previous Aircraft Tail Number)\s(.*)/
    // HANDLE ALT SOMEHOW

    var field_names = ["linked_to","nationality","dob","aka","pob","passport","nit","cedula_no", "cedula_no","ssn","dni","rfc","website", "website", "vessel_registration_number","gender", "swift_bic","tax_id_no","email", "phone", "phone", "registration_id","company_number","aircraft_construction_number","citizen","additional_sanctions_info","aircraft_manufacture_date","aircraft_model","aircraft_operator","position","national_id_number","identification_number","previous_aircraft_tail_number"]
    var remarks_names = ["Linked To:", "nationality", "DOB", "a\.k\.a\.","POB","Passport", "NIT", "Cedula No.","Cedula\sNo\.\s ", "SSN", "D\.N\.I\.", "R\.F\.C\.", "Website:", "Website", "Vessel Registration Identification", "Gender", "SWIFT\/BIC", "Tax ID No\.", "Email Address", "Telephone:", "Phone No\.", "Registration ID", "Company Number", "Aircraft Construction Number", "citizen", "Additional Sanctions Information \-", "Aircraft Manufacture Date", "Aircraft Model", "Aircraft Operator", "Position:", "National ID No\.", "Identification Number", "Previous Aircraft Tail Number"]

    var list_fields = new Set(["linked_to", 'passport','dob','pob','citizen','rfc','nationality','identification_number','additional_sanctions_info','registration_id','national_id_number','website','email','tax_id_no','aircraft_model','aircraft_operator','nit','swift_bic']);

    var field_set = new Set()

    var alt_set = new Set();

    var remarks_to_fields = {}
    for (var i = 0; i<field_names.length; i++){
        remarks_to_fields[remarks_names[i]] = field_names[i]
    }
    // console.log(remarks_to_fields)

    fs.createReadStream('sdn.csv')
        .pipe(csv({
            headers: csv_headers
        }))
        .on('data', data => {
            for (var attr in data) {
                if (data[attr] == "-0- ") {
                    data[attr] = null;
                }
            }

            if (data.remarks != null) {
                // console.log(data.remarks)
                let remarks_separated = data.remarks.split(";");


                for (var i = 0; i < remarks_separated.length; i++) {

                    var is_alt = false;

                    let remark = remarks_separated[i]

                    if(remarks_separated[i].substring(0,4) === " alt"){
                        is_alt = true
                        let remark = remarks_separated[i].substring(6, remarks_separated[i].length);
                        // console.log(remark)
                    }

                    // let remark = remarks_separated[i];
                    let result = remarks_matcher.exec(remark);

                    if (result !== null) {

                        let field_name = remarks_to_fields[result[1]];
                        let field_value = result[2];

                        field_set.add(field_name)

                        if(is_alt){
                            // console.log("ALT");
                            alt_set.add(field_name);
                        }


                        if(list_fields.has(field_name)){
                            // console.log(field_name)
                            // console.log("Array add for "+field_name);
                            if(data[field_name] == null){
                                data[field_name] = [field_value]
                            }
                            else{
                                data[field_name].push(field_value)
                            }
                        }
                        else{
                            data[field_name] = field_value;
                        }

                    }
                    else {
                        if (data.hasOwnProperty('notes')) {
                            data['notes'] += '; ' + remark;
                        }
                        else {
                            data['notes'] = remark;
                        }
                    }
                }
                // console.log(data)
            }
            json_data.push(data);
        })
        .on('end', () => {
            // console.log(json_data[10])
            shipToDB(json_data);
        });
}
