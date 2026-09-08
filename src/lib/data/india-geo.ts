/**
 * Comprehensive Dataset of Indian States, Districts, and Main Cities.
 * Used for Chapter creation, campus discovery, and location filtering.
 */

export interface IndiaDistrict {
  name: string;
  cities: string[];
}

export interface IndiaState {
  state: string;
  code: string;
  districts: IndiaDistrict[];
}

export interface CityOption {
  city: string;
  district: string;
  state: string;
  lat?: number;
  lng?: number;
}

export const INDIA_STATES_DATA: IndiaState[] = [
  {
    state: "Kerala",
    code: "KL",
    districts: [
      {
        name: "Kozhikode",
        cities: ["Kozhikode (Calicut)", "Kattangal", "Vadakara", "Koyilandy", "Feroke", "Ramanattukara", "Koduvally"],
      },
      {
        name: "Ernakulam",
        cities: ["Kochi (Cochin)", "Kalamassery", "Thrikkakara", "Aluva", "Angamaly", "North Paravur", "Perumbavoor", "Muvattupuzha", "Kothamangalam", "Tripunithura"],
      },
      {
        name: "Thiruvananthapuram",
        cities: ["Thiruvananthapuram (Trivandrum)", "Sreekaryam", "Kazhakkoottam", "Varkala", "Neyyattinkara", "Attingal", "Nedumangad"],
      },
      {
        name: "Thrissur",
        cities: ["Thrissur", "Chalakudy", "Kodungallur", "Guruvayur", "Kunnamkulam", "Irinjalakuda", "Wadakkanchery"],
      },
      {
        name: "Palakkad",
        cities: ["Palakkad", "Ottapalam", "Shoranur", "Chittur-Thathamangalam", "Mannarkkad", "Pudussery"],
      },
      {
        name: "Malappuram",
        cities: ["Malappuram", "Manjeri", "Perinthalmanna", "Tirur", "Kottakkal", "Ponnani", "Nilambur", "Kondotty"],
      },
      {
        name: "Kollam",
        cities: ["Kollam (Quilon)", "Karunagappalli", "Paravur", "Punalur", "Kottarakkara"],
      },
      {
        name: "Kannur",
        cities: ["Kannur", "Thalassery", "Payyanur", "Taliparamba", "Mattannur", "Koothuparamba", "Iritty"],
      },
      {
        name: "Alappuzha",
        cities: ["Alappuzha (Alleppey)", "Cherthala", "Kayamkulam", "Mavelikkara", "Chengannur", "Haripad"],
      },
      {
        name: "Kottayam",
        cities: ["Kottayam", "Changanassery", "Pala", "Ettumanoor", "Vaikom", "Erattupetta"],
      },
      {
        name: "Kasaragod",
        cities: ["Kasaragod", "Kanhangad", "Nileshwar", "Uppala"],
      },
      {
        name: "Wayanad",
        cities: ["Kalpetta", "Mananthavady", "Sulthan Bathery", "Meppadi"],
      },
      {
        name: "Pathanamthitta",
        cities: ["Pathanamthitta", "Thiruvalla", "Adoor", "Pandalam", "Ranni"],
      },
      {
        name: "Idukki",
        cities: ["Thodupuzha", "Munnar", "Kattappana", "Adimali", "Painavu"],
      },
    ],
  },
  {
    state: "Karnataka",
    code: "KA",
    districts: [
      {
        name: "Bengaluru Urban",
        cities: ["Bengaluru (Bangalore)", "Whitefield", "Electronic City", "Yelahanka", "Kengeri"],
      },
      {
        name: "Bengaluru Rural",
        cities: ["Devanahalli", "Doddaballapura", "Hosakote", "Nelamangala"],
      },
      {
        name: "Dakshina Kannada",
        cities: ["Mangaluru (Mangalore)", "Surathkal", "Bantwal", "Puttur", "Belthangady"],
      },
      {
        name: "Mysuru",
        cities: ["Mysuru (Mysore)", "Nanjangud", "Hunsur", "T. Narasipura"],
      },
      {
        name: "Dharwad",
        cities: ["Hubballi (Hubli)", "Dharwad"],
      },
      {
        name: "Belagavi",
        cities: ["Belagavi (Belgaum)", "Gokak", "Chikkodi", "Nipani"],
      },
      {
        name: "Udupi",
        cities: ["Udupi", "Manipal", "Kundapura", "Karkala"],
      },
      {
        name: "Shivamogga",
        cities: ["Shivamogga (Shimoga)", "Bhadravati", "Sagar"],
      },
      {
        name: "Kalaburagi",
        cities: ["Kalaburagi (Gulbarga)", "Sedam", "Shahabad"],
      },
      {
        name: "Tumakuru",
        cities: ["Tumakuru (Tumkur)", "Tiptur", "Madhugiri"],
      },
      {
        name: "Ballari",
        cities: ["Ballari (Bellary)", "Sandur"],
      },
      {
        name: "Davanagere",
        cities: ["Davanagere", "Harihar"],
      },
    ],
  },
  {
    state: "Tamil Nadu",
    code: "TN",
    districts: [
      {
        name: "Chennai",
        cities: ["Chennai (Madras)", "Guindy", "T. Nagar", "Adyar", "Velachery", "Tambaram"],
      },
      {
        name: "Coimbatore",
        cities: ["Coimbatore", "Pollachi", "Mettupalayam"],
      },
      {
        name: "Madurai",
        cities: ["Madurai", "Melur", "Thirumangalam"],
      },
      {
        name: "Tiruchirappalli",
        cities: ["Tiruchirappalli (Trichy)", "Thuvakudi", "Manapparai"],
      },
      {
        name: "Salem",
        cities: ["Salem", "Attur", "Mettur"],
      },
      {
        name: "Tirunelveli",
        cities: ["Tirunelveli", "Ambasamudram"],
      },
      {
        name: "Chengalpattu",
        cities: ["Chengalpattu", "Kanchipuram", "Mahabalipuram"],
      },
      {
        name: "Erode",
        cities: ["Erode", "Bhavani", "Gobichettipalayam"],
      },
      {
        name: "Vellore",
        cities: ["Vellore", "Katpadi", "Gudiyatham"],
      },
      {
        name: "Kanyakumari",
        cities: ["Nagercoil", "Kanyakumari", "Marthandam"],
      },
      {
        name: "Thanjavur",
        cities: ["Thanjavur", "Kumbakonam", "Pattukkottai"],
      },
      {
        name: "Tiruppur",
        cities: ["Tiruppur", "Avinashi", "Dharapuram"],
      },
      {
        name: "Dindigul",
        cities: ["Dindigul", "Kodaikanal", "Palani"],
      },
    ],
  },
  {
    state: "Maharashtra",
    code: "MH",
    districts: [
      {
        name: "Mumbai City",
        cities: ["Mumbai (South Mumbai)", "Nariman Point", "Fort", "Colaba"],
      },
      {
        name: "Mumbai Suburban",
        cities: ["Andheri", "Bandra", "Borivali", "Goregaon", "Powai", "Kurla"],
      },
      {
        name: "Pune",
        cities: ["Pune", "Pimpri-Chinchwad", "Hinjawadi", "Hadapsar", "Baramati"],
      },
      {
        name: "Nagpur",
        cities: ["Nagpur", "Kamthi", "Umred"],
      },
      {
        name: "Thane",
        cities: ["Thane", "Kalyan-Dombivli", "Navi Mumbai", "Mira-Bhayandar", "Ulhasnagar"],
      },
      {
        name: "Nashik",
        cities: ["Nashik", "Malegaon", "Deolali"],
      },
      {
        name: "Chhatrapati Sambhajinagar",
        cities: ["Chhatrapati Sambhajinagar (Aurangabad)", "Paithan"],
      },
      {
        name: "Solapur",
        cities: ["Solapur", "Pandharpur", "Barshi"],
      },
      {
        name: "Kolhapur",
        cities: ["Kolhapur", "Ichalkaranji", "Jaysingpur"],
      },
      {
        name: "Amravati",
        cities: ["Amravati", "Achalpur"],
      },
    ],
  },
  {
    state: "Delhi",
    code: "DL",
    districts: [
      {
        name: "New Delhi",
        cities: ["New Delhi", "Connaught Place", "Chanakyapuri"],
      },
      {
        name: "South Delhi",
        cities: ["Saket", "Hauz Khas", "Greater Kailash", "Mehrauli"],
      },
      {
        name: "South West Delhi",
        cities: ["Dwarka", "Vasant Kunj", "Najafgarh"],
      },
      {
        name: "North Delhi",
        cities: ["Civil Lines", "Model Town", "Narela"],
      },
      {
        name: "North West Delhi",
        cities: ["Rohini", "Pitampura", "Shalimar Bagh"],
      },
      {
        name: "Central Delhi",
        cities: ["Karol Bagh", "Pahar Ganj", "Daryaganj"],
      },
      {
        name: "East Delhi",
        cities: ["Laxmi Nagar", "Preet Vihar", "Mayur Vihar"],
      },
    ],
  },
  {
    state: "Telangana",
    code: "TG",
    districts: [
      {
        name: "Hyderabad",
        cities: ["Hyderabad", "Secunderabad", "Gachibowli", "Hitec City", "Madhapur"],
      },
      {
        name: "Medchal-Malkajgiri",
        cities: ["Kukatpally", "Malkajgiri", "Alwal"],
      },
      {
        name: "Rangareddy",
        cities: ["Shamshabad", "Rajendranagar", "Serilingampally"],
      },
      {
        name: "Warangal Urban",
        cities: ["Warangal", "Hanamkonda", "Kazipet"],
      },
      {
        name: "Karimnagar",
        cities: ["Karimnagar", "Ramagundam"],
      },
      {
        name: "Nizamabad",
        cities: ["Nizamabad", "Bodhan", "Armoor"],
      },
      {
        name: "Khammam",
        cities: ["Khammam", "Kothagudem"],
      },
    ],
  },
  {
    state: "Andhra Pradesh",
    code: "AP",
    districts: [
      {
        name: "Visakhapatnam",
        cities: ["Visakhapatnam (Vizag)", "Anakapalle", "Gajuwaka"],
      },
      {
        name: "NTR / Krishna",
        cities: ["Vijayawada", "Machilipatnam", "Gudivada"],
      },
      {
        name: "Guntur",
        cities: ["Guntur", "Tenali", "Amaravati", "Mangalagiri"],
      },
      {
        name: "Tirupati",
        cities: ["Tirupati", "Srikalahasti", "Venkatagiri"],
      },
      {
        name: "Kurnool",
        cities: ["Kurnool", "Nandyal", "Adoni"],
      },
      {
        name: "SPSR Nellore",
        cities: ["Nellore", "Kavali", "Gudur"],
      },
      {
        name: "Kakinada",
        cities: ["Kakinada", "Rajahmundry", "Samalkot"],
      },
      {
        name: "Ananthapuramu",
        cities: ["Anantapur", "Dharmavaram", "Hindupur"],
      },
    ],
  },
  {
    state: "Gujarat",
    code: "GJ",
    districts: [
      {
        name: "Ahmedabad",
        cities: ["Ahmedabad", "Sanand", "Dholka"],
      },
      {
        name: "Surat",
        cities: ["Surat", "Bardoli", "Navsari"],
      },
      {
        name: "Vadodara",
        cities: ["Vadodara (Baroda)", "Padra", "Karjan"],
      },
      {
        name: "Rajkot",
        cities: ["Rajkot", "Gondal", "Jetpur"],
      },
      {
        name: "Gandhinagar",
        cities: ["Gandhinagar", "Kalol"],
      },
      {
        name: "Bhavnagar",
        cities: ["Bhavnagar", "Mahuva"],
      },
      {
        name: "Jamnagar",
        cities: ["Jamnagar"],
      },
      {
        name: "Anand",
        cities: ["Anand", "Vallabh Vidyanagar", "Khambhat"],
      },
    ],
  },
  {
    state: "West Bengal",
    code: "WB",
    districts: [
      {
        name: "Kolkata",
        cities: ["Kolkata (Calcutta)", "Salt Lake City (Bidhannagar)", "New Town"],
      },
      {
        name: "Howrah",
        cities: ["Howrah", "Uluberia"],
      },
      {
        name: "Paschim Bardhaman",
        cities: ["Durgapur", "Asansol", "Raniganj"],
      },
      {
        name: "Darjeeling",
        cities: ["Darjeeling", "Siliguri", "Kurseong"],
      },
      {
        name: "Paschim Medinipur",
        cities: ["Kharagpur", "Medinipur"],
      },
    ],
  },
  {
    state: "Uttar Pradesh",
    code: "UP",
    districts: [
      {
        name: "Gautam Buddha Nagar",
        cities: ["Noida", "Greater Noida"],
      },
      {
        name: "Lucknow",
        cities: ["Lucknow", "Malihabad"],
      },
      {
        name: "Kanpur Nagar",
        cities: ["Kanpur", "Bithoor"],
      },
      {
        name: "Ghaziabad",
        cities: ["Ghaziabad", "Modinagar"],
      },
      {
        name: "Varanasi",
        cities: ["Varanasi (Banaras)", "Ramnagar"],
      },
      {
        name: "Agra",
        cities: ["Agra", "Fatehpur Sikri"],
      },
      {
        name: "Prayagraj",
        cities: ["Prayagraj (Allahabad)", "Phulpur"],
      },
      {
        name: "Meerut",
        cities: ["Meerut", "Sardhana"],
      },
      {
        name: "Aligarh",
        cities: ["Aligarh"],
      },
      {
        name: "Gorakhpur",
        cities: ["Gorakhpur"],
      },
      {
        name: "Bareilly",
        cities: ["Bareilly"],
      },
    ],
  },
  {
    state: "Rajasthan",
    code: "RJ",
    districts: [
      {
        name: "Jaipur",
        cities: ["Jaipur", "Amer", "Sanganer"],
      },
      {
        name: "Jodhpur",
        cities: ["Jodhpur", "Bilara"],
      },
      {
        name: "Kota",
        cities: ["Kota", "Ramganj Mandi"],
      },
      {
        name: "Udaipur",
        cities: ["Udaipur", "Fatehnagar"],
      },
      {
        name: "Bikaner",
        cities: ["Bikaner"],
      },
      {
        name: "Ajmer",
        cities: ["Ajmer", "Pushkar", "Kishangarh"],
      },
      {
        name: "Alwar",
        cities: ["Alwar", "Bhiwadi"],
      },
    ],
  },
  {
    state: "Madhya Pradesh",
    code: "MP",
    districts: [
      {
        name: "Indore",
        cities: ["Indore", "Mhow", "Sanwer"],
      },
      {
        name: "Bhopal",
        cities: ["Bhopal", "Berasia"],
      },
      {
        name: "Jabalpur",
        cities: ["Jabalpur", "Sihora"],
      },
      {
        name: "Gwalior",
        cities: ["Gwalior", "Dabra"],
      },
      {
        name: "Ujjain",
        cities: ["Ujjain", "Nagda"],
      },
    ],
  },
  {
    state: "Punjab",
    code: "PB",
    districts: [
      {
        name: "SAS Nagar",
        cities: ["Mohali (SAS Nagar)", "Kharar", "Zirakpur", "Dera Bassi"],
      },
      {
        name: "Ludhiana",
        cities: ["Ludhiana", "Jagraon", "Khanna"],
      },
      {
        name: "Amritsar",
        cities: ["Amritsar", "Ajnala"],
      },
      {
        name: "Jalandhar",
        cities: ["Jalandhar", "Phagwara"],
      },
      {
        name: "Patiala",
        cities: ["Patiala", "Nabha", "Rajpura"],
      },
      {
        name: "Bathinda",
        cities: ["Bathinda", "Rampura Phul"],
      },
    ],
  },
  {
    state: "Haryana",
    code: "HR",
    districts: [
      {
        name: "Gurugram",
        cities: ["Gurugram (Gurgaon)", "Manesar", "Sohna"],
      },
      {
        name: "Faridabad",
        cities: ["Faridabad", "Ballabhgarh"],
      },
      {
        name: "Panchkula",
        cities: ["Panchkula", "Kalka", "Pinjore"],
      },
      {
        name: "Panipat",
        cities: ["Panipat", "Samalkha"],
      },
      {
        name: "Ambala",
        cities: ["Ambala", "Ambala Cantt"],
      },
      {
        name: "Karnal",
        cities: ["Karnal", "Gharaunda"],
      },
      {
        name: "Sonipat",
        cities: ["Sonipat", "Rai", "Kundli"],
      },
      {
        name: "Rohtak",
        cities: ["Rohtak", "Meham"],
      },
    ],
  },
  {
    state: "Bihar",
    code: "BR",
    districts: [
      {
        name: "Patna",
        cities: ["Patna", "Danapur", "Phulwari Sharif", "Fatwah"],
      },
      {
        name: "Gaya",
        cities: ["Gaya", "Bodh Gaya"],
      },
      {
        name: "Bhagalpur",
        cities: ["Bhagalpur", "Naugachhia"],
      },
      {
        name: "Muzaffarpur",
        cities: ["Muzaffarpur", "Kanti"],
      },
      {
        name: "Darbhanga",
        cities: ["Darbhanga", "Benipur"],
      },
    ],
  },
  {
    state: "Odisha",
    code: "OD",
    districts: [
      {
        name: "Khordha",
        cities: ["Bhubaneswar", "Jatni", "Khordha"],
      },
      {
        name: "Cuttack",
        cities: ["Cuttack", "Choudwar"],
      },
      {
        name: "Sundargarh",
        cities: ["Rourkela", "Sundargarh"],
      },
      {
        name: "Ganjam",
        cities: ["Berhampur", "Chhatrapur"],
      },
      {
        name: "Sambalpur",
        cities: ["Sambalpur", "Burla"],
      },
      {
        name: "Puri",
        cities: ["Puri", "Konark"],
      },
    ],
  },
  {
    state: "Assam",
    code: "AS",
    districts: [
      {
        name: "Kamrup Metropolitan",
        cities: ["Guwahati", "Dispur", "North Guwahati"],
      },
      {
        name: "Dibrugarh",
        cities: ["Dibrugarh", "Naharkatiya"],
      },
      {
        name: "Cachar",
        cities: ["Silchar"],
      },
      {
        name: "Jorhat",
        cities: ["Jorhat", "Mariani"],
      },
      {
        name: "Sonitpur",
        cities: ["Tezpur"],
      },
    ],
  },
  {
    state: "Goa",
    code: "GA",
    districts: [
      {
        name: "North Goa",
        cities: ["Panaji (Panjim)", "Mapusa", "Pernem", "Bicholim"],
      },
      {
        name: "South Goa",
        cities: ["Margao (Madgaon)", "Vasco da Gama", "Ponda", "Quepem", "Curchorem"],
      },
    ],
  },
  {
    state: "Uttarakhand",
    code: "UK",
    districts: [
      {
        name: "Dehradun",
        cities: ["Dehradun", "Rishikesh", "Mussoorie", "Vikasnagar"],
      },
      {
        name: "Haridwar",
        cities: ["Haridwar", "Roorkee"],
      },
      {
        name: "Nainital",
        cities: ["Nainital", "Haldwani", "Ramnagar"],
      },
      {
        name: "Udham Singh Nagar",
        cities: ["Rudrapur", "Kashipur", "Pantnagar"],
      },
    ],
  },
  {
    state: "Jharkhand",
    code: "JH",
    districts: [
      {
        name: "Ranchi",
        cities: ["Ranchi", "Kanke", "Bundu"],
      },
      {
        name: "East Singhbhum",
        cities: ["Jamshedpur (Tatanagar)", "Ghatshila"],
      },
      {
        name: "Dhanbad",
        cities: ["Dhanbad", "Jharia", "Sindri"],
      },
      {
        name: "Bokaro",
        cities: ["Bokaro Steel City", "Chas"],
      },
    ],
  },
  {
    state: "Chhattisgarh",
    code: "CG",
    districts: [
      {
        name: "Raipur",
        cities: ["Raipur", "Nava Raipur", "Birgaon"],
      },
      {
        name: "Durg",
        cities: ["Bhilai", "Durg"],
      },
      {
        name: "Bilaspur",
        cities: ["Bilaspur", "Kota"],
      },
      {
        name: "Korba",
        cities: ["Korba"],
      },
    ],
  },
  {
    state: "Himachal Pradesh",
    code: "HP",
    districts: [
      {
        name: "Shimla",
        cities: ["Shimla", "Kufri", "Rampur"],
      },
      {
        name: "Kangra",
        cities: ["Dharamshala", "Palampur", "Kangra"],
      },
      {
        name: "Solan",
        cities: ["Solan", "Baddi", "Nalagarh"],
      },
      {
        name: "Kullu",
        cities: ["Kullu", "Manali"],
      },
      {
        name: "Mandi",
        cities: ["Mandi", "Sundernagar"],
      },
    ],
  },
  {
    state: "Jammu and Kashmir",
    code: "JK",
    districts: [
      {
        name: "Srinagar",
        cities: ["Srinagar"],
      },
      {
        name: "Jammu",
        cities: ["Jammu"],
      },
      {
        name: "Anantnag",
        cities: ["Anantnag", "Pahalgam"],
      },
      {
        name: "Baramulla",
        cities: ["Baramulla", "Gulmarg", "Sopore"],
      },
    ],
  },
  {
    state: "Chandigarh",
    code: "CH",
    districts: [
      {
        name: "Chandigarh",
        cities: ["Chandigarh"],
      },
    ],
  },
  {
    state: "Puducherry",
    code: "PY",
    districts: [
      {
        name: "Puducherry",
        cities: ["Puducherry (Pondicherry)", "Oulgaret"],
      },
      {
        name: "Mahe",
        cities: ["Mahe"],
      },
      {
        name: "Karaikal",
        cities: ["Karaikal"],
      },
    ],
  },
  {
    state: "Tripura",
    code: "TR",
    districts: [
      {
        name: "West Tripura",
        cities: ["Agartala"],
      },
    ],
  },
  {
    state: "Meghalaya",
    code: "ML",
    districts: [
      {
        name: "East Khasi Hills",
        cities: ["Shillong"],
      },
    ],
  },
  {
    state: "Sikkim",
    code: "SK",
    districts: [
      {
        name: "East Sikkim",
        cities: ["Gangtok"],
      },
    ],
  },
  {
    state: "Ladakh",
    code: "LA",
    districts: [
      {
        name: "Leh",
        cities: ["Leh"],
      },
      {
        name: "Kargil",
        cities: ["Kargil"],
      },
    ],
  },
];

/** Approximate center coordinates for states & main hubs */
export const STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Kerala: { lat: 10.8505, lng: 76.2711 },
  Karnataka: { lat: 12.9716, lng: 77.5946 },
  "Tamil Nadu": { lat: 13.0827, lng: 80.2707 },
  Maharashtra: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Telangana: { lat: 17.385, lng: 78.4867 },
  "Andhra Pradesh": { lat: 16.5062, lng: 80.648 },
  Gujarat: { lat: 23.0225, lng: 72.5714 },
  "West Bengal": { lat: 22.5726, lng: 88.3639 },
  "Uttar Pradesh": { lat: 26.8467, lng: 80.9462 },
  Rajasthan: { lat: 26.9124, lng: 75.7873 },
  "Madhya Pradesh": { lat: 22.7196, lng: 75.8577 },
  Punjab: { lat: 30.7333, lng: 76.7794 },
  Haryana: { lat: 28.4595, lng: 77.0266 },
  Bihar: { lat: 25.5941, lng: 85.1376 },
  Odisha: { lat: 20.2961, lng: 85.8245 },
  Assam: { lat: 26.1445, lng: 91.7362 },
  Goa: { lat: 15.4909, lng: 73.8278 },
  Uttarakhand: { lat: 30.3165, lng: 78.0322 },
  Jharkhand: { lat: 23.3441, lng: 85.3096 },
  Chhattisgarh: { lat: 21.2514, lng: 81.6296 },
  "Himachal Pradesh": { lat: 31.1048, lng: 77.1734 },
  "Jammu and Kashmir": { lat: 34.0837, lng: 74.7973 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Puducherry: { lat: 11.9416, lng: 79.8083 },
  Tripura: { lat: 23.8315, lng: 91.2868 },
  Meghalaya: { lat: 25.5788, lng: 91.8933 },
  Sikkim: { lat: 27.3389, lng: 88.6065 },
  Ladakh: { lat: 34.1526, lng: 77.5771 },
};

/** Approximate coordinates for key districts/cities to auto-assist map pin placement */
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Kozhikode (Calicut)": { lat: 11.2588, lng: 75.7804 },
  Kattangal: { lat: 11.3216, lng: 75.9336 },
  "Kochi (Cochin)": { lat: 9.9312, lng: 76.2673 },
  Kalamassery: { lat: 10.0436, lng: 76.3244 },
  Thrikkakara: { lat: 10.0284, lng: 76.3284 },
  "Thiruvananthapuram (Trivandrum)": { lat: 8.5241, lng: 76.9366 },
  Sreekaryam: { lat: 8.5456, lng: 76.9064 },
  Kazhakkoottam: { lat: 8.5686, lng: 76.8731 },
  Thrissur: { lat: 10.5276, lng: 76.2144 },
  Palakkad: { lat: 10.7867, lng: 76.6548 },
  Manjeri: { lat: 11.1215, lng: 76.1213 },
  Malappuram: { lat: 11.051, lng: 76.0711 },
  "Kollam (Quilon)": { lat: 8.8932, lng: 76.6141 },
  Kannur: { lat: 11.8745, lng: 75.3704 },
  Thalassery: { lat: 11.748, lng: 75.4894 },
  "Alappuzha (Alleppey)": { lat: 9.4981, lng: 76.3388 },
  Kottayam: { lat: 9.5916, lng: 76.5222 },
  Kasaragod: { lat: 12.4996, lng: 74.9869 },
  Kalpetta: { lat: 11.6103, lng: 76.0827 },
  Pathanamthitta: { lat: 9.2648, lng: 76.787 },
  Thodupuzha: { lat: 9.8959, lng: 76.7184 },
  "Bengaluru (Bangalore)": { lat: 12.9716, lng: 77.5946 },
  "Mangaluru (Mangalore)": { lat: 12.9141, lng: 74.856 },
  Surathkal: { lat: 13.0119, lng: 74.7943 },
  "Mysuru (Mysore)": { lat: 12.2958, lng: 76.6394 },
  Manipal: { lat: 13.3525, lng: 74.7868 },
  "Chennai (Madras)": { lat: 13.0827, lng: 80.2707 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  "Tiruchirappalli (Trichy)": { lat: 10.7905, lng: 78.7047 },
  Salem: { lat: 11.6643, lng: 78.146 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  "Navi Mumbai": { lat: 19.033, lng: 73.0297 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  "Visakhapatnam (Vizag)": { lat: 17.6868, lng: 83.2185 },
  Vijayawada: { lat: 16.5062, lng: 80.648 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  "Kolkata (Calcutta)": { lat: 22.5726, lng: 88.3639 },
  Noida: { lat: 28.5355, lng: 77.391 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  "Mohali (SAS Nagar)": { lat: 30.7046, lng: 76.7179 },
  "Gurugram (Gurgaon)": { lat: 28.4595, lng: 77.0266 },
  Patna: { lat: 25.5941, lng: 85.1376 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  "Panaji (Panjim)": { lat: 15.4909, lng: 73.8278 },
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Ranchi: { lat: 23.3441, lng: 85.3096 },
};

/** Get all State names in India */
export function getAllStates(): string[] {
  return INDIA_STATES_DATA.map((s) => s.state);
}

/** Get districts for a given State */
export function getDistrictsForState(stateName: string): string[] {
  const state = INDIA_STATES_DATA.find(
    (s) => s.state.toLowerCase() === stateName.toLowerCase()
  );
  return state ? state.districts.map((d) => d.name) : [];
}

/** Get main cities for a state and district */
export function getCitiesForDistrict(stateName: string, districtName: string): string[] {
  const state = INDIA_STATES_DATA.find(
    (s) => s.state.toLowerCase() === stateName.toLowerCase()
  );
  if (!state) return [];
  const district = state.districts.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase()
  );
  return district ? district.cities : [];
}

/** Flat list of all Indian cities with their district and state */
export function getAllIndianCities(): CityOption[] {
  const list: CityOption[] = [];
  for (const s of INDIA_STATES_DATA) {
    for (const d of s.districts) {
      for (const city of d.cities) {
        const coords = CITY_COORDINATES[city];
        list.push({
          city,
          district: d.name,
          state: s.state,
          lat: coords?.lat,
          lng: coords?.lng,
        });
      }
    }
  }
  return list;
}
