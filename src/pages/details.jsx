import { useState, useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import Footer from "../components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { appAuth, appDB, appStorage } from "../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Helmet } from "react-helmet-async";
import NavBar from "../components/NavBar";
import UploadSection from "../components/buycomponent/UploadSection";
import ReactGA from "react-ga4";
import Webcam from "react-webcam";
import { X } from "lucide-react";

// Analytics event for user navigation
function UserNavigation(label) {
  ReactGA.event({
    category: "User Interaction",
    action: "User Dashboard",
    label: label,
  });
}

// Convert data URL to File for webcam captures
const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(",");
  let mime = arr[0].match(/:(.*?);/)[1];
  let bstr = atob(arr[1]);
  let n = bstr.length;
  let u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export default function YourDetails({ title }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    licenseFront: null,
    licenseBack: null,
    aadhaarFront: null,
    aadhaarBack: null,
    uploaded: {
      licenseFront: false,
      licenseBack: false,
      aadhaarFront: false,
      aadhaarBack: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const navigate = useNavigate();

  const [aadharFrontImage, setAadharFrontImage] = useState(null);
  const [aadharBackImage, setAadharBackImage] = useState(null);
  const [drivingFrontImage, setDrivingFrontImage] = useState(null);
  const [drivingBackImage, setDrivingBackImage] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState("aadhar");
  const [currentPage, setCurrentPage] = useState("front");

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Fetch user data on component mount
  useEffect(() => {
    const unsubscribe = appAuth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Fetch user profile using UID
          const profileRef = doc(
            appDB,
            "users",
            user.uid
          );
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const docData = profileSnap.data();
            console.log("User Profile Data:", docData);

            const mappedData = {
              name: docData.name || docData.firstname || "",
              phone:
                docData.phone || docData.mobileNumber?.replace("+91", "") || "",
              email: docData.email || "",
              dob: docData.dob || docData.DateOfBirth || "",
              licenseFront:
                docData.licenseFront ||
                docData.front_page_driving_license ||
                null,
              licenseBack:
                docData.licenseBack ||
                docData.back_page_driving_license ||
                null,
              aadhaarFront:
                docData.aadhaarFront || docData.front_page_aadhaar_card || null,
              aadhaarBack:
                docData.aadhaarBack || docData.back_page_aadhaar_card || null,
              uploaded: docData.uploaded || {
                licenseFront: !!(
                  docData.licenseFront || docData.front_page_driving_license
                ),
                licenseBack: !!(
                  docData.licenseBack || docData.back_page_driving_license
                ),
                aadhaarFront: !!(
                  docData.aadhaarFront || docData.front_page_aadhaar_card
                ),
                aadhaarBack: !!(
                  docData.aadhaarBack || docData.back_page_aadhaar_card
                ),
              },
            };

            setFormData(mappedData);

            // Update image states for display
            setDrivingFrontImage(mappedData.licenseFront);
            setDrivingBackImage(mappedData.licenseBack);
            setAadharFrontImage(mappedData.aadhaarFront);
            setAadharBackImage(mappedData.aadhaarBack);
          } else {
            // Prefill name and email from authenticated user
            setFormData((prev) => ({
              ...prev,
              name: user.displayName || "",
              email: user.email || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
      const timer = setTimeout(() => setIsSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  // Check if all fields are filled
  const isFormValid = () => {
    // Check each field individually to handle edge cases
    try {
      // Required fields
      const nameValid = formData?.name && formData.name.trim() !== '';
      const phoneValid = formData?.phone && formData.phone.trim() !== '';
      const emailValid = formData?.email && formData.email.trim() !== '';
      const dobValid = formData?.dob && formData.dob.trim() !== '';
 
      return (
        nameValid &&
        phoneValid &&
        emailValid &&
        dobValid
      );
    } catch (error) {
      console.error("Error in form validation:", error);
      return false; // Return false on any error
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // To handle image upload
  const handleImageUpload = (type, page, docType) => {
    setCurrentDocType(docType);
    setCurrentPage(page);

    if (type === "camera") {
      setCameraOpen(true);
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (!file.type.startsWith("image/")) {
            alert("Please upload an image file"); // Changed from toast.error
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const imageUrl = reader.result;
            if (docType === "driving") {
              if (page === "front") {
                setDrivingFrontImage(imageUrl);
                setFormData((prev) => ({ ...prev, licenseFront: file }));
              } else {
                setDrivingBackImage(imageUrl);
                setFormData((prev) => ({ ...prev, licenseBack: file }));
              }
            } else if (docType === "aadhar") {
              if (page === "front") {
                setAadharFrontImage(imageUrl);
                setFormData((prev) => ({ ...prev, aadhaarFront: file }));
              } else {
                setAadharBackImage(imageUrl);
                setFormData((prev) => ({ ...prev, aadhaarBack: file }));
              }
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  // Capture Photo
  const capturePhoto = (imageSrc) => {
    const file = dataURLtoFile(
      imageSrc,
      `${currentDocType}_${currentPage}.jpg`
    );
    if (currentDocType === "driving") {
      if (currentPage === "front") {
        setDrivingFrontImage(imageSrc);
        setFormData((prev) => ({ ...prev, licenseFront: file }));
      } else {
        setDrivingBackImage(imageSrc);
        setFormData((prev) => ({ ...prev, licenseBack: file }));
      }
    } else if (currentDocType === "aadhar") {
      if (currentPage === "front") {
        setAadharFrontImage(imageSrc);
        setFormData((prev) => ({ ...prev, aadhaarFront: file }));
      } else {
        setAadharBackImage(imageSrc);
        setFormData((prev) => ({ ...prev, aadhaarBack: file }));
      }
    }
    setCameraOpen(false);
  };

  // Upload Files into APP DB project Firebase Datastore
  const uploadFile = async (file, path, filename) => {
    // Create a reference with the specific filename
    const storageRef = ref(appStorage, `${path}${filename}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  // Function to save user details to Firestore
  const handleSave = async () => {
    if (!isFormValid()) {
      alert("Please fill all fields and upload all documents.");
      return;
    }

    setIsSaving(true);

    try {
      const user = appAuth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Create a folder path for this user's documents
      const basePath = `userImages/${user.uid}/`;
      
      // Upload files to Firebase Storage with the correct standard names
      const licenseFrontURL =
        formData.licenseFront instanceof File
          ? await uploadFile(
              formData.licenseFront,
              basePath,
              "front_page_driving_license.png"
            )
          : formData.licenseFront;
      
      const licenseBackURL =
        formData.licenseBack instanceof File
          ? await uploadFile(
              formData.licenseBack,
              basePath,
              "back_page_driving_license.png"
            )
          : formData.licenseBack;
      
      const aadhaarFrontURL =
        formData.aadhaarFront instanceof File
          ? await uploadFile(
              formData.aadhaarFront,
              basePath,
              "front_page_aadhaar_card.png"
            )
          : formData.aadhaarFront;
      
      const aadhaarBackURL =
        formData.aadhaarBack instanceof File
          ? await uploadFile(
              formData.aadhaarBack,
              basePath,
              "back_page_aadhaar_card.png"
            )
          : formData.aadhaarBack;

      // Create user profile object with field names that match the backend structure
      const userProfile = {
        name: formData.name,
        phone: null, // Keep as null to match your API structure
        email: formData.email,
        mobileNumber: formData.phone ? `${formData.phone}` : null,
        DateOfBirth: formData.dob,
        front_page_driving_license: licenseFrontURL,
        back_page_driving_license: licenseBackURL,
        front_page_aadhaar_card: aadhaarFrontURL,
        back_page_aadhaar_card: aadhaarBackURL,
        city: "",
        street1: "",
        street2: "",
        zipcode: "",
        // Keep the uploaded tracking for frontend use
        uploaded: {
          licenseFront: !!licenseFrontURL,
          licenseBack: !!licenseBackURL,
          aadhaarFront: !!aadhaarFrontURL,
          aadhaarBack: !!aadhaarBackURL,
        },
      };

      // Save or update user-specific document using UID
      const profileRef = doc(appDB, "users", user.uid);
      await setDoc(profileRef, userProfile);

      setIsSaved(true);
      UserNavigation("User Profile Saved");
    } catch (error) {
      console.error("Error saving profile: ", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    console.log("Account Deleted");
    UserNavigation("User Deleted Account");
  };

  // Frontend UI remains unchanged below this point
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content="Enter your personal details for a seamless experience with Zymo."
        />
        <link rel="canonical" href="https://zymo.app/your-details" />
        <meta property="og:title" content={title} />
        <meta
          property="og:description"
          content="Keep your personal details up to date on Zymo."
        />
      </Helmet>
      <NavBar />
      <button
        onClick={() => navigate("/")}
        className="text-white m-5 cursor-pointer"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <div className="min-h-screen bg-[#212121] p-4 flex justify-center items-center">
        <div className="w-full max-w-lg bg-[#424242] p-6 rounded-lg shadow-lg text-white font-sans">
          <h2 className="text-xl font-semibold mb-4 flex justify-center items-center">
            Profile Details
          </h2>

          {isSaved && (
            <div className="mb-4 p-3 bg-green-500 text-white rounded-lg text-center">
              Profile saved successfully!
            </div>
          )}

          <label className="block mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-3 bg-white text-black"
            placeholder="Enter name"
            required
          />

          <label className="block mb-2">Phone</label>
          <input
            type="tel"
            pattern="[0-9]{10}"
            maxLength={10}
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-3 bg-white text-black"
            placeholder="Enter phone"
            required
          />

          <label className="block mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-3 bg-white text-black"
            placeholder="Enter email"
            required
          />

          <label className="block mb-2">Date of Birth</label>
          <input
            type="date"
            name="dob"
            value={formData.dob || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-3 bg-white text-black"
            required
          />

          <div className="bg-[#2A2A2A] p-6 md:p-8 rounded-xl shadow-2xl border border-white/10">
            <div className="space-y-8">
              <UploadSection
                title="Upload Driving License Front Page"
                image={drivingFrontImage}
                onUpload={(type) => handleImageUpload(type, "front", "driving")}
              />

              <UploadSection
                title="Upload Driving License Back Page"
                image={drivingBackImage}
                onUpload={(type) => handleImageUpload(type, "back", "driving")}
              />

              <UploadSection
                title="Upload Aadhar Card Front Page"
                image={aadharFrontImage}
                onUpload={(type) => handleImageUpload(type, "front", "aadhar")}
              />

              <UploadSection
                title="Upload Aadhar Card Back Page"
                image={aadharBackImage}
                onUpload={(type) => handleImageUpload(type, "back", "aadhar")}
              />
            </div>
          </div>

          {cameraOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-[#121212] p-6 rounded-lg w-[90%] md:w-[600px] text-white text-center relative">
                <button
                  onClick={() => setCameraOpen(false)}
                  className="absolute top-2 right-2 text-white"
                >
                  <X size={24} />
                </button>
                <h3 className="text-xl mb-4">Take a Photo</h3>
                <div className="text-center">
                  <Webcam
                    audio={false}
                    height={500}
                    screenshotFormat="image/jpeg"
                    width={500}
                    className="text-center"
                  >
                    {({ getScreenshot }) => (
                      <button
                        onClick={() => {
                          const imageSrc = getScreenshot();
                          if (imageSrc) {
                            capturePhoto(imageSrc);
                          }
                        }}
                        className="mt-4 bg-[#edff8d] p-3 rounded-lg text-black"
                      >
                        Capture photo
                      </button>
                    )}
                  </Webcam>
                </div>
              </div>
            </div>
          )}

          <button
            className="w-full bg-white text-black p-2 rounded-lg mt-2 flex items-center justify-center gap-2 hover:bg-gray-300"
            onClick={handleDeleteAccount}
          >
            <FaTrash /> Delete Account
          </button>

          <button
            className={`w-full bg-[#edff8d] text-black p-2 rounded-lg mt-4 flex items-center justify-center gap-2 ${
              !isFormValid() || isSaving
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#d4e07d]"
            }`}
            onClick={handleSave}
            disabled={!isFormValid() || isSaving}
          >
            {console.log("Form Valid:", isFormValid())}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <Footer />
    </>
  );
}
